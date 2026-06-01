# Windhoox 架构文档

> 本文档描述 Windhoox 的系统架构、核心流程和数据模型。阅读本文后，开发者应能感知项目的整体骨架，并能独立地在任意一层添加或修改功能。

---

## 1. 系统概述

### 1.1 产品定位

Windhoox 是一款**本地运行的桌面应用**，帮助产品经理、工程师和测试人员将需求描述转化为结构化的测试设计资产。核心工作流为：

```
需求描述 → AI 代理分析 → 业务规则/风险见解 + 测试用例 → 人工评审 → 迭代优化
```

### 1.2 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 桌面框架 | Electron | 主进程 + 预加载脚本 + 渲染进程 |
| 前端框架 | React 19 | 函数组件 + Hooks |
| 构建工具 | Vite 8 | 热更新、快速打包 |
| 类型系统 | TypeScript 6 | 全项目类型化 |
| 测试框架 | Vitest | 单元测试 + 组件测试 |
| 自动更新 | electron-updater | GitHub Releases 渠道 |

### 1.3 设计原则

| 原则 | 说明 |
|------|------|
| **本地优先** | 所有数据存储在本地文件系统，不上传云端 |
| **安全隔离** | 渲染进程无权直接访问 Node.js API，通过 `contextBridge` 暴露受限 API |
| **事件驱动** | 整个 UI 由 Agent 事件流驱动，而非轮询 |
| **类型安全** | IPC 消息、Agent 事件、状态模型均使用 TypeScript 严格类型 |

---

## 2. 进程架构

### 2.1 三层进程模型

```mermaid
flowchart TB
    subgraph R["渲染进程 (Renderer) — Chromium"]
        direction TB
        REACT["React App"]
        COMP["组件层\nWorkbench / TaskInput / InsightCard / TestCaseCard"]
        STATE["状态层\nagent-state.ts (Reducer)"]
    end

    subgraph P["预加载脚本 (Preload) — 安全桥梁"]
        BRIDGE["contextBridge\nwindow.windhoox.agent"]
    end

    subgraph M["主进程 (Main) — Node.js"]
        direction TB
        IPC["ipcMain 处理器\nagent-handlers.ts"]
        RUNNER["Agent 执行器\nagent-runner.ts"]
        WINDOW["BrowserWindow"]
    end

    REACT --> COMP --> STATE
    STATE -->|调用 API| BRIDGE
    BRIDGE <-->|IPC 消息| IPC
    IPC --> RUNNER
    IPC -->|send("agent:event")| WINDOW
    WINDOW -->|推送事件| BRIDGE
    BRIDGE -->|onEvent| STATE
```

### 2.2 安全模型

| 配置 | 值 | 说明 |
|------|-----|------|
| `contextIsolation` | `true` | 渲染进程与预加载脚本的上下文隔离 |
| `nodeIntegration` | `false` | 渲染进程无法直接访问 Node.js |
| `sandbox` | `false` | 预加载脚本需要访问文件系统（加载会话） |
| `preload` | `preload.js` | 通过 `contextBridge` 暴露白名单 API |

> ⚠️ `sandbox: false` 是有意为之的权衡。预加载脚本需要读写本地会话文件，完全沙箱化会阻断这一能力。安全由 `contextBridge` 的白名单机制保证。

### 2.3 IPC 通道

| 通道 | 方向 | 调用方式 | 说明 |
|------|------|----------|------|
| `agent:start-analysis` | Renderer → Main | `invoke` | 启动新的分析会话 |
| `agent:continue-analysis` | Renderer → Main | `invoke` | 基于反馈继续迭代分析 |
| `agent:review-case` | Renderer → Main | `invoke` | 提交测试用例评审结果 |
| `agent:load-session` | Renderer → Main | `invoke` | 加载历史会话 |
| `agent:event` | Main → Renderer | `send` | 流式推送 Agent 进度事件 |

---

## 3. 核心流程

以下 4 个流程覆盖应用的全部用户交互路径。每个流程都配有 Mermaid 序列图，展示跨进程的消息流。

### 3.1 Flow 1 — 新建分析会话

用户输入需求，Agent 开始分析，结果逐步流式展示到三栏界面。

```mermaid
sequenceDiagram
    actor U as 用户
    participant TI as TaskInput
    participant WB as Workbench
    participant PL as preload.ts
    participant AH as agent-handlers.ts
    participant AR as agent-runner.ts

    U->>TI: 输入需求文本
    U->>TI: 点击「开始分析」
    TI->>WB: onSubmit(requirement)
    WB->>WB: 创建 session (state="running")
    WB->>PL: agent.startAnalysis({requirementText})
    PL->>AH: ipcRenderer.invoke("agent:start-analysis")
    AH->>AH: 生成 sessionId
    AH->>AR: runLocalAgent({sessionId, requirementText})
    AH-->>PL: return {sessionId}
    PL-->>WB: return {sessionId}
    WB->>WB: 更新 session.id

    Note over AR: 异步执行分析...
    AR->>AH: 返回 AgentEvent[]

    loop 逐条发送事件
        AH->>PL: mainWindow.webContents.send("agent:event", event)
        PL->>WB: onEvent(event) → dispatch(event)
        WB->>WB: agentStateReducer(state, event)
    end

    alt event.type == "requirement_insight"
        WB->>WB: insights 数组追加
        WB->>U: 渲染 InsightCard（中栏）
    else event.type == "case_candidates"
        WB->>WB: cases 数组替换
        WB->>U: 渲染 TestCaseCard（右栏）
    else event.type == "run_completed"
        WB->>WB: status = "completed"
        WB->>U: 显示「分析完成」+ 继续分析按钮
    else event.type == "run_failed"
        WB->>WB: status = "failed"
        WB->>U: 显示错误信息
    end
```

#### 关键代码路径

| 步骤 | 文件 | 函数/代码 |
|------|------|----------|
| 触发分析 | `src/renderer/components/TaskInput.tsx` | `handleSubmit` → `onSubmit(requirement)` |
| 调用 Agent API | `src/renderer/components/Workbench.tsx` | `handleStartAnalysis` |
| IPC 桥接 | `src/preload/preload.ts` | `startAnalysis: (payload) => ipcRenderer.invoke(...)` |
| 主进程处理 | `src/main/agent-handlers.ts` | `ipcMain.handle("agent:start-analysis", ...)` |
| Agent 执行 | `src/main/agent-runner.ts` | `runLocalAgent(input)` |
| 事件回推 | `src/main/agent-handlers.ts` | `mainWindow?.webContents.send("agent:event", event)` |
| 状态更新 | `src/renderer/state/agent-state.ts` | `agentStateReducer(state, event)` |
| UI 渲染 | `src/renderer/components/Workbench.tsx` | 根据 `agentState` 条件渲染 |

### 3.2 Flow 2 — 测试用例评审

用户展开测试用例卡片，选择接受/拒绝/澄清，状态实时更新。

```mermaid
sequenceDiagram
    actor U as 用户
    participant TC as TestCaseCard
    participant WB as Workbench
    participant PL as preload.ts
    participant AH as agent-handlers.ts

    U->>TC: 点击卡片头部展开
    U->>TC: 点击「接受」/「拒绝」/「澄清」
    TC->>WB: onStatusChange(caseId, status)
    WB->>WB: dispatch({type: "case_reviewed", caseId, status})
    WB->>WB: agentStateReducer 更新 case 状态
    WB->>TC: TestCaseCard 重新渲染（新状态标签）
    WB->>WB: TestCaseCounter 重新渲染（计数更新）

    WB->>PL: agent.reviewCase({sessionId, caseId, status})
    PL->>AH: ipcRenderer.invoke("agent:review-case")
    AH-->>PL: return {success: true}
    PL-->>WB: return {success: true}
```

#### 关键特性

- **乐观更新**：本地状态在调用 IPC 前就已经更新，UI 响应零延迟
- **状态流转**：`pending` → `accepted` / `rejected` / `ask_product` / `ask_engineering` / `needs_context`
- **计数联动**：`TestCaseCounter` 根据 `agentState.cases` 实时计算各状态数量

### 3.3 Flow 3 — 迭代继续分析

用户基于已有评审结果，发起新一轮更精准的分析。

```mermaid
sequenceDiagram
    actor U as 用户
    participant CB as ContinueAnalysisButton
    participant WB as Workbench
    participant PL as preload.ts
    participant AH as agent-handlers.ts
    participant AR as agent-runner.ts

    U->>WB: 评审若干测试用例
    U->>CB: 点击「继续分析」
    CB->>CB: 收集 acceptedCaseIds / rejectedCaseIds / unresolvedQuestions
    CB->>WB: onContinue({sessionId, previousSessionId, feedback})
    WB->>WB: 创建新 session (state="running")
    WB->>PL: agent.continueAnalysis(payload)
    PL->>AH: ipcRenderer.invoke("agent:continue-analysis")
    AH-->>PL: return {success: true}

    Note over AH,AR: 与 Flow 1 相同的事件流...
    AH->>AR: runLocalAgent(...)
    AR->>AH: 返回新一批 AgentEvent[]
    AH->>PL: send("agent:event", event)
    PL->>WB: dispatch(event) → reducer
    WB->>U: 新见解 + 新测试用例
```

#### 关键特性

- **状态重置 + 合并**：新会话开始后，旧的 `insights` 和 `cases` 会被新事件替换（`case_candidates` 事件直接覆盖 `cases` 数组），但用户已评审的状态会保留（需要事件协议扩展支持）
- **反馈闭环**：上一轮接受的用例会被 Agent 作为「正确示例」参考，拒绝的用例则作为「反面教材」

### 3.4 Flow 4 — 演示模式

无需后端 Agent，一键加载完整演示数据，用于快速体验 UI 能力。

```mermaid
sequenceDiagram
    actor U as 用户
    participant TI as TaskInput
    participant WB as Workbench
    participant DD as demo-data.ts
    participant R as agentStateReducer

    U->>TI: 点击「加载演示任务」
    TI->>WB: onLoadDemo()
    WB->>WB: 创建 session (id=DEMO_SESSION_ID, state="completed")
    WB->>DD: 读取 DEMO_EVENTS 数组

    loop 遍历 DEMO_EVENTS
        WB->>R: dispatch(event)
        R->>R: 按 event.type 更新状态
    end

    WB->>U: 完整的三栏界面（见解 + 测试用例 + 计数器）
```

#### 关键特性

- **零延迟**：所有数据在内存中，无需 IPC 往返
- **完整覆盖**：包含 `run_started`、`reading_sources`、`requirement_insight`、`missing_questions`、`case_candidates`、`coverage_matrix`、`run_completed` 全部事件类型
- **场景**：电商支付系统（支付宝/微信/银行卡，200 元阈值，短信验证）

---

## 4. Agent 事件协议

### 4.1 事件类型总览

所有 Agent 与 UI 的通信通过 `AgentEvent` 联合类型完成，定义于 `src/types/agent.ts`。

| 事件类型 | 何时触发 | 状态影响 | UI 效果 |
|---------|---------|---------|---------|
| `run_started` | 分析会话开始 | 初始化 `AgentState` | 显示「分析中...」 |
| `reading_sources` | Agent 读取上下文文件 | 无（当前 reducer 忽略） | 可作为进度指示 |
| `requirement_insight` | 提取到业务规则/风险 | `insights` 追加 | 渲染 InsightCard |
| `missing_questions` | 发现需求缺口 | `questions` 替换 | **当前未渲染** |
| `case_candidates` | 生成测试用例 | `cases` 替换 | 渲染 TestCaseCard |
| `coverage_matrix` | 需求-用例映射完成 | `coverage` 替换 | **当前未渲染** |
| `run_completed` | 分析正常结束 | `status = "completed"` | 显示完成状态 + 继续分析按钮 |
| `run_failed` | 分析失败 | `status = "failed"` | 显示错误信息 |
| `case_reviewed` | 用户评审用例 | 更新对应 case 的 `status` | 更新状态标签 + 计数器 |

### 4.2 状态机

```mermaid
stateDiagram-v2
    [*] --> Idle : 应用启动
    Idle --> Running : 用户点击「开始分析」或「加载演示」
    Running --> Running : 收到 insight / case / question 事件
    Running --> Completed : 收到 run_completed
    Running --> Failed : 收到 run_failed
    Completed --> Running : 点击「继续分析」（新会话）
    Failed --> Running : 重试（未实现）
```

### 4.3 AgentState 数据模型

```typescript
interface AgentState {
  sessionId: string;           // 当前会话 ID
  status: "idle" | "running" | "completed" | "failed";
  requirement: string;         // 原始需求文本
  insights: Array<{            // 分析见解
    id: string;
    businessRule?: string;
    risk?: string;
    evidence?: string;
    confidence: "high" | "medium" | "low";
  }>;
  questions: Array<{           // 待澄清问题
    id: string;
    category: "product" | "engineering" | "qa";
    question: string;
  }>;
  cases: Array<{               // 测试用例
    id: string;
    title: string;
    description: string;
    preconditions: string[];
    steps: string[];
    expectedResult: string;
    status: "pending" | "accepted" | "rejected" | "ask_product" | "ask_engineering" | "needs_context";
  }>;
  coverage: Array<{            // 覆盖矩阵
    requirementId: string;
    caseIds: string[];
  }>;
  error?: string;              // 失败时的错误信息
  artifacts?: {                // 产物文件路径
    conversationPath: string;
    insightPath: string;
    casesPath: string;
    coveragePath: string;
  };
}
```

### 4.4 Reducer 行为

`agentStateReducer` 位于 `src/renderer/state/agent-state.ts`，采用 Redux 风格的不可变更新：

| 事件 | Reducer 行为 |
|------|-------------|
| `run_started` | 全新状态对象，`sessionId`、`status`、`insights`、`cases` 全部重置 |
| `requirement_insight` | `insights` 数组追加新项（保留已有） |
| `missing_questions` | `questions` 数组替换为新列表 |
| `case_candidates` | `cases` 数组替换为新列表 |
| `coverage_matrix` | `coverage` 数组替换为新列表 |
| `run_completed` | `status = "completed"`，记录 `artifacts` |
| `run_failed` | `status = "failed"`，记录 `error` |
| `case_reviewed` | 遍历 `cases`，匹配 `caseId` 的项更新 `status` |

---

## 5. 组件架构

### 5.1 组件层次

```mermaid
flowchart TD
    subgraph App["App.tsx"]
        WB["Workbench"]
    end

    subgraph WB_Children["Workbench 子组件"]
        direction TB
        TI["TaskInput"]
        IC["InsightCard × N"]
        TCC["TestCaseCard × N"]
        TCNT["TestCaseCounter"]
        CAB["ContinueAnalysisButton"]
    end

    subgraph State["状态 (useReducer)"]
        R["agentStateReducer"]
    end

    App --> WB
    WB --> TI
    WB --> IC
    WB --> TCC
    WB --> TCNT
    WB --> CAB
    WB --> R

    TI -->|onSubmit| WB
    TI -->|onLoadDemo| WB
    TCC -->|onStatusChange| WB
    CAB -->|onContinue| WB
```

### 5.2 各组件职责

| 组件 | 文件 | 职责 | 接收 Props |
|------|------|------|-----------|
| **Workbench** | `Workbench.tsx` | 三栏布局 orchestrator；持有 session 状态和 agentState；所有 IPC 调用的发起者 | 无（顶层） |
| **TaskInput** | `TaskInput.tsx` | 需求输入表单；支持加载演示任务 | `onSubmit`, `onLoadDemo?`, `isLoading` |
| **InsightCard** | `InsightCard.tsx` | 展示单条分析见解 | `businessRule?`, `risk?`, `evidence?`, `confidence` |
| **TestCaseCard** | `TestCaseCard.tsx` | 可展开/折叠的测试用例卡片；支持状态操作 | `testCase`, `onStatusChange` |
| **TestCaseCounter** | `TestCaseCounter.tsx` | 统计面板：待审核/已接受/已拒绝/需澄清 | `counts` |
| **ContinueAnalysisButton** | `ContinueAnalysisButton.tsx` | 收集评审反馈，发起新一轮分析 | `state`, `onContinue` |

### 5.3 状态所有权

| 状态 | 所有者 | 类型 | 说明 |
|------|--------|------|------|
| `session` | Workbench | `useState<Session \| null>` | 会话元数据（ID、状态、需求文本） |
| `agentState` | Workbench | `useReducer(agentStateReducer)` | 分析结果的全局状态 |
| `requirement` | TaskInput | `useState<string>` | 输入框的受控值 |
| `expanded` | TestCaseCard | `useState<boolean>` | 单个卡片的展开状态 |

---

## 6. 文件组织

### 6.1 目录结构

```
src/
├── main/                          # Electron 主进程（Node.js 环境）
│   ├── main.ts                    # 应用入口：创建窗口、注册处理器、初始化更新器
│   ├── updater.ts                 # 自动更新逻辑
│   ├── agent-handlers.ts          # IPC 处理器注册（4 个通道）
│   ├── agent-runner.ts            # Agent 执行器（当前为 Stub）
│   └── agent-runner.test.ts       # Agent 执行器测试
│
├── preload/                       # 预加载脚本（安全桥梁）
│   ├── preload.ts                 # 暴露 window.windhoox.agent API
│   └── preload.test.ts            # 预加载 API 测试
│
├── renderer/                      # React 前端（Chromium 环境）
│   ├── main.tsx                   # React DOM 挂载点
│   ├── App.tsx                    # 根组件
│   ├── styles.css                 # CSS 变量和设计令牌
│   ├── demo-data.ts               # 演示场景数据
│   ├── components/                # React 组件
│   │   ├── Workbench.tsx          # 三栏布局 orchestrator
│   │   ├── TaskInput.tsx          # 需求输入表单
│   │   ├── InsightCard.tsx        # 分析见解卡片
│   │   ├── TestCaseCard.tsx       # 测试用例卡片
│   │   ├── TestCaseCounter.tsx    # 状态计数器
│   │   └── ContinueAnalysisButton.tsx  # 继续分析按钮
│   └── state/                     # 状态管理
│       └── agent-state.ts         # Reducer + AgentState 类型
│
└── types/                         # 共享类型
    └── agent.ts                   # AgentEvent、Payload、Listener 类型
```

### 6.2 关键文件速查

| 文件 | 责任域 | 修改频率 |
|------|--------|---------|
| `src/types/agent.ts` | 协议契约 | 低 — 变更影响全系统 |
| `src/renderer/state/agent-state.ts` | 状态机 | 中 — 新增事件类型时需更新 |
| `src/main/agent-handlers.ts` | IPC 入口 | 中 — 新增通道时注册 |
| `src/main/agent-runner.ts` | Agent 实现 | 高 — 核心智能能力在此 |
| `src/preload/preload.ts` | API 白名单 | 低 — 新增暴露方法时更新 |
| `src/renderer/components/Workbench.tsx` | UI 编排 | 高 — 新功能的主入口 |

---

## 7. 开发指南

### 7.1 如何添加新的 IPC 通道

以添加 `agent:export-report` 为例：

**Step 1 — 定义类型** (`src/types/agent.ts`)
```typescript
export interface ExportReportPayload {
  sessionId: string;
  format: "pdf" | "markdown" | "json";
}
```

**Step 2 — 注册处理器** (`src/main/agent-handlers.ts`)
```typescript
ipcMain.handle("agent:export-report", async (_event, payload: ExportReportPayload) => {
  // 实现导出逻辑
  return { filePath: "/path/to/report.pdf" };
});
```

**Step 3 — 暴露到渲染进程** (`src/preload/preload.ts`)
```typescript
const agentApi = {
  // ... 现有方法
  exportReport: (payload: ExportReportPayload) =>
    ipcRenderer.invoke("agent:export-report", payload),
};
```

**Step 4 — 组件中使用** (`src/renderer/components/*.tsx`)
```typescript
const result = await agentApi.exportReport({ sessionId, format: "pdf" });
```

### 7.2 如何添加新的 Agent 事件类型

以添加 `test_plan_generated` 事件为例：

**Step 1 — 定义类型** (`src/types/agent.ts`)
```typescript
export interface TestPlanGeneratedEvent {
  type: "test_plan_generated";
  sessionId: string;
  plan: { phase: string; tasks: string[] }[];
  timestamp: number;
}

// 添加到 AgentEvent 联合类型
export type AgentEvent =
  | ...existing types
  | TestPlanGeneratedEvent;
```

**Step 2 — 更新 Reducer** (`src/renderer/state/agent-state.ts`)
```typescript
export interface AgentState {
  // ... 现有字段
  plan?: { phase: string; tasks: string[] }[];
}

// 在 switch 中添加 case
case "test_plan_generated": {
  const s = ensureState(state, event.sessionId);
  return { ...s, plan: event.plan };
}
```

**Step 3 — 更新 UI** (`src/renderer/components/Workbench.tsx`)
在渲染逻辑中读取 `agentState.plan` 并渲染对应组件。

### 7.3 如何添加新的组件

**Step 1 — 创建组件文件**
```
src/renderer/components/MyComponent.tsx
src/renderer/components/MyComponent.css
src/renderer/components/MyComponent.test.tsx
```

**Step 2 — 遵循现有模式**
- 使用函数组件 + TypeScript 接口定义 Props
- CSS 使用项目定义的 CSS 变量（见 `styles.css`）
- 测试使用 Vitest + @testing-library/react

**Step 3 — 在 Workbench 中引入**
```typescript
import { MyComponent } from "./MyComponent";

// 在渲染逻辑中使用
{agentState?.plan && <MyComponent plan={agentState.plan} />}
```

---

## 8. 项目实施进度表

> 本表列出项目的全部功能模块及其实现状态。`✅` 表示已实现并通过测试，`🔄` 表示部分实现（Stub 或 MVP），`⬜` 表示尚未开始。

### 8.1 基础设施

| 模块 | 状态 | 说明 | 相关文件 |
|------|------|------|---------|
| Electron 应用框架 | ✅ | 主进程 + 预加载脚本 + 渲染进程，窗口管理 | `src/main/main.ts` |
| Vite 构建系统 | ✅ | 渲染器 HMR + Electron 主进程编译 | `vite.config.ts`, `tsconfig.node.json` |
| TypeScript 类型检查 | ✅ | 全项目严格类型，渲染器 + 主进程双重检查 | `tsconfig.json`, `tsconfig.node.json` |
| 单元测试 | ✅ | Vitest + @testing-library/react，50 个测试全部通过 | `vitest.config.ts`, `*.test.ts` |
| CI/CD | ✅ | GitHub Actions：变更检测、渲染器测试、Electron 测试、构建 | `.github/workflows/ci.yml` |
| 自动更新 | ✅ | electron-updater，GitHub Releases 渠道 | `src/main/updater.ts` |
| 中文文档同步 | ✅ | CLAUDE.zh.md / AGENTS.zh.md + 自动同步脚本 + CI | `scripts/sync-docs.ts`, `.github/workflows/sync-docs.yml` |

### 8.2 核心架构

| 模块 | 状态 | 说明 | 相关文件 |
|------|------|------|---------|
| 3-Process 安全模型 | ✅ | contextIsolation + contextBridge + sandbox 配置 | `src/main/main.ts`, `src/preload/preload.ts` |
| IPC 通道注册 | ✅ | 4 个通道已注册：start/continue/review/load | `src/main/agent-handlers.ts` |
| IPC 桥接 API | ✅ | window.windhoox.agent 暴露 typed 方法 | `src/preload/preload.ts` |
| Agent 事件协议 | ✅ | 9 种事件类型定义 + AgentEvent 联合类型 | `src/types/agent.ts` |
| 事件状态机 | ✅ | Redux-style reducer，覆盖全部事件类型 | `src/renderer/state/agent-state.ts` |
| 事件流推送 | ✅ | Main → Renderer 单向事件流 | `src/main/agent-handlers.ts` |

### 8.3 UI 组件

| 组件 | 状态 | 说明 | 相关文件 |
|------|------|------|---------|
| Workbench 三栏布局 | ✅ | 左(任务) / 中(分析) / 右(用例) | `src/renderer/components/Workbench.tsx` |
| TaskInput 需求输入 | ✅ | 文本输入 + 提交 + 演示模式入口 | `src/renderer/components/TaskInput.tsx` |
| InsightCard 分析见解 | ✅ | 业务规则/风险/证据/信心度展示 | `src/renderer/components/InsightCard.tsx` |
| TestCaseCard 测试用例 | ✅ | 可展开卡片 + 接受/拒绝/澄清操作 | `src/renderer/components/TestCaseCard.tsx` |
| TestCaseCounter 计数器 | ✅ | 待审核/已接受/已拒绝/需澄清统计 | `src/renderer/components/TestCaseCounter.tsx` |
| ContinueAnalysisButton 继续分析 | ✅ | 收集反馈并发起新一轮分析 | `src/renderer/components/ContinueAnalysisButton.tsx` |
| 问题澄清 UI | ⬜ | questions 数组未在 Workbench 中渲染 | — |
| 覆盖矩阵可视化 | ⬜ | coverage 数组未在 Workbench 中渲染 | — |
| 会话管理列表 | ⬜ | 无历史会话列表 UI | — |
| 文件上下文选择器 | ⬜ | TaskInput 无法选择本地代码文件 | — |
| 错误恢复 UI | ⬜ | run_failed 后无重试按钮 | — |

### 8.4 Agent 智能能力

| 模块 | 状态 | 说明 | 相关文件 |
|------|------|------|---------|
| 需求分析触发 | ✅ | IPC 完整链路打通 | `src/main/agent-handlers.ts` |
| 流式事件生成 | ✅ | 事件数组逐条回推至渲染进程 | `src/main/agent-handlers.ts` |
| 真实 AI 分析 | ⬜ | agent-runner.ts 为 Stub，无 LLM 接入 | `src/main/agent-runner.ts` |
| 上下文文件读取 | ⬜ | 未实现本地代码文件的读取和解析 | — |
| 迭代分析（continue）| 🔄 | IPC 通道存在，处理器返回占位 | `src/main/agent-handlers.ts:44` |
| 用例评审（review）| 🔄 | IPC 通道存在，处理器返回占位 | `src/main/agent-handlers.ts:48` |
| 会话加载（load）| 🔄 | IPC 通道存在，处理器返回占位 | `src/main/agent-handlers.ts:52` |

### 8.5 数据持久化

| 模块 | 状态 | 说明 | 相关文件 |
|------|------|------|---------|
| 产物路径定义 | ✅ | run_completed 返回 artifactPaths | `src/types/agent.ts` |
| 会话文件存储 | ⬜ | 未实现 sessions/{sessionId}/ 目录读写 | — |
| 产物文件生成 | ⬜ | runLocalAgent 返回路径但从不创建文件 | `src/main/agent-runner.ts` |
| 历史会话加载 | ⬜ | load-session 处理器为 Stub | `src/main/agent-handlers.ts:52` |

### 8.6 演示与辅助

| 模块 | 状态 | 说明 | 相关文件 |
|------|------|------|---------|
| 演示数据模块 | ✅ | 完整电商支付场景：4 见解 + 3 问题 + 9 用例 + 覆盖矩阵 | `src/renderer/demo-data.ts` |
| 演示模式入口 | ✅ | TaskInput 中的「加载演示任务」按钮 | `src/renderer/components/TaskInput.tsx` |
| 架构文档 | ✅ | 系统架构 + 核心流程 + 数据模型 + 开发指南 | `docs/architecture.md` |

### 8.7 进度汇总

| 类别 | 已实现 | 部分实现 | 未实现 | 完成率 |
|------|--------|---------|--------|--------|
| 基础设施 | 7 | 0 | 0 | 100% |
| 核心架构 | 6 | 0 | 0 | 100% |
| UI 组件 | 6 | 0 | 5 | 55% |
| Agent 能力 | 2 | 3 | 2 | 29% |
| 数据持久化 | 1 | 0 | 3 | 25% |
| 演示与辅助 | 3 | 0 | 0 | 100% |
| **总计** | **25** | **3** | **10** | **66%** |

### 8.8 路线图

#### 第一阶段：补齐 Stub（优先级 🔴）
1. **真实 Agent 接入**：替换 `agent-runner.ts` 中的 Stub，接入本地 LLM（如 Ollama）或云端 API
2. **会话持久化**：实现 `sessions/{sessionId}/` 目录读写，支持加载历史会话
3. **迭代分析完整实现**：实现 `continue-analysis` 处理器的真实逻辑

#### 第二阶段：补齐 UI（优先级 🟡）
4. **问题澄清 UI**：在 Workbench 中渲染 `questions` 数组，允许用户在线回答
5. **覆盖矩阵可视化**：用矩阵表格展示需求 ↔ 用例的覆盖关系
6. **错误恢复 UI**：`run_failed` 后显示重试按钮和详细错误信息

#### 第三阶段：增强体验（优先级 🟢）
7. **文件上下文选择器**：允许用户在 TaskInput 中选择本地代码文件作为分析上下文
8. **会话管理列表**：历史会话列表，支持删除、重命名、搜索
9. **产物导出**：支持将分析结果导出为 PDF / Markdown / JSON
