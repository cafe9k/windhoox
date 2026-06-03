# Windhoox Agent 技术架构与迁移实施规格：Claude Agent SDK First

## 1. 文档定位

本文是一份面向开发落地的实施规格，用于指导 Windhoox 从当前 DeepSeek 单次 JSON 生成方案迁移到 **Claude Agent SDK First** 架构。

本文重点回答：

- 目标架构是什么。
- Claude 相关代码和资源如何收敛。
- 当前 DeepSeek 代码如何迁移和移除。
- MVP 先做什么，不做什么。
- IPC、事件、结果、Artifact、Session、安全和测试如何落地。

核心决策：

| 决策项 | 结论 |
|---|---|
| 架构方向 | Claude Agent SDK First |
| DeepSeek 后续 | 完全替换，不保留 legacy provider |
| MVP 是否包含 Skills | 不包含，先跑通 Claude SDK + 固定 JSON 输出 |
| 文档目标 | 可直接指导开发实施 |

---

## 2. 背景与目标

Windhoox 的业务目标是构建一个本地测试设计工作台，支持用户输入需求、页面文本、URL、HTML 或上下文资料后，自动完成：

- 页面 / 需求理解
- 测试风险识别
- 测试点覆盖分析
- 测试用例生成
- 用例校验与修正
- 用例资产沉淀
- 多轮继续分析
- 后续本地 Skill 扩展
- 后续自定义 Agent 扩展
- Memory 记忆和会话恢复

新的技术约束是：

> 使用 Claude Agent SDK 完成 Agent 搭建。任何 Agent 相关功能只要 SDK 能提供，Windhoox 不重复造轮子。

因此，Windhoox 不再自研完整 Agent 框架，而是采用 **Claude Agent SDK First** 架构。

---

## 3. 当前系统现状

当前主进程 Agent 能力主要由以下文件组成：

```text
src/main/agent-handlers.ts
src/main/agent-runner.ts
src/main/deepseek-client.ts
src/main/config.ts
src/types/agent.ts
src/preload/preload.ts
src/renderer/features/workbench/*
```

当前运行方式：

```text
Renderer
→ preload
→ agent:start-analysis
→ agent-handlers.ts
→ agent-runner.ts
→ deepseek-client.ts
→ DeepSeek Chat Completion
→ JSON.parse
→ AgentEvent[]
→ Renderer 展示
```

当前主要问题：

- `agent-runner.ts` 是一次性 LLM 调用，不具备 Agent loop。
- `deepseek-client.ts` 与目标 Claude Agent SDK 架构冲突。
- Artifact 当前是 `/tmp` 假路径，未真正持久化。
- `continueAnalysis`、`reviewCase`、`loadSession` 还是占位实现。
- 配置仍是 `deepseekApiKey`、`deepseekBaseUrl`、`deepseekModel`。
- 没有 Claude session、权限 hooks、结果 schema 校验和真实 trace。

---

## 4. 设计原则

## 4.1 SDK First

凡是 Claude Agent SDK 原生支持的能力，优先使用 SDK：

| 能力 | 归属 |
|---|---|
| Agent 执行循环 | Claude Agent SDK |
| Tool 调用循环 | Claude Agent SDK |
| Session Resume | Claude Agent SDK |
| Hooks 生命周期 | Claude Agent SDK |
| Permissions / allowed tools | Claude Agent SDK |
| MCP | Claude Agent SDK |
| 自定义 Agent / Subagent | Claude Agent SDK，Phase 3 接入 |
| Skills | Claude Agent SDK / Claude Code 配置体系，Phase 2 接入 |
| Memory / 会话上下文 | Claude Agent SDK，Phase 4 接入 |

Windhoox 只负责：

| 能力 | 归属 |
|---|---|
| Electron UI | Windhoox |
| IPC 安全桥 | Windhoox |
| `AgentEvent` UI 协议 | Windhoox |
| 测试用例业务展示 | Windhoox |
| Artifact 业务产物 | Windhoox |
| 用户配置 UI | Windhoox |
| Claude SDK options 组装 | Windhoox |
| SDK 消息到 UI 事件适配 | Windhoox |
| 业务 JSON Schema 校验 | Windhoox |
| 本地安全策略参数化 | Windhoox |

## 4.2 不重复造轮子边界

Windhoox 不自研：

- 自定义 Agent 引擎
- Subagent 调度器
- Agent workflow 引擎
- Tool loop
- Tool calling 协议
- Agent memory 引擎
- Agent session 管理器
- Skill 执行引擎
- Skill 路由器
- MCP 客户端框架
- Agent hooks 框架

Windhoox 只做必要适配：

- Claude SDK options 组装
- Claude SDK 消息流消费
- SDK 输出到 `AgentEvent` 的转换
- Claude 最终结果到测试用例业务模型的转换
- `zod` schema 校验
- Windhoox artifact 写入
- 安全策略配置和 hooks 函数

## 4.3 SOLID 落地约束

当前设计整体符合 SOLID 方向，但实现阶段需要重点约束 `runClaudeAnalysis`、IPC handlers 和后续扩展点，避免 Claude Runtime 演化成新的大而全模块。

| 原则 | 当前符合度 | 落地要求 |
|---|---|---|
| SRP 单一职责 | 高 | `runClaudeAnalysis` 只做流程编排，不直接承担 JSON 提取、schema 校验、事件适配和文件写入细节。 |
| OCP 开闭原则 | 中高 | Phase 2 / Phase 3 扩展 Skills、Subagents、MCP 时，优先新增 installer、adapter、policy，而不是修改 runtime 主流程。 |
| LSP 里氏替换 | 中 | `SessionStore`、`ArtifactWriter`、`ClaudeSessionStore` 等后续如有测试替身或内存实现，必须保持相同行为契约。 |
| ISP 接口隔离 | 高 | Renderer 只依赖 preload API 和 `AgentEvent`，不得感知 Claude SDK 原始类型。 |
| DIP 依赖倒置 | 中 | IPC 层应依赖 `AgentRuntime` 抽象，而不是直接依赖 Claude SDK 或具体 runtime 实现。 |

实现约束：

- `agent-handlers.ts` 只能作为 IPC 边界，依赖 `AgentRuntime` 接口，不直接调用 Claude SDK。
- `ClaudeAgentRuntime` 是 `AgentRuntime` 的生产实现，内部再组合 `ClaudeResultExtractor`、`ClaudeEventAdapter`、`ArtifactWriter`、`ClaudeSessionStore`。
- `ClaudeResultExtractor`、`ClaudeEventAdapter`、`ArtifactWriter`、`ClaudeSessionStore`、`ClaudePermissionHooks` 必须独立可测。
- `createClaudeOptions` 只负责 options 组装，不读取 UI 状态、不写 artifact、不解析 Claude 输出。
- `ClaudeEventAdapter` 只做事件转换，不调用文件系统、不访问配置、不发 IPC。
- `ArtifactWriter` 只写 Windhoox 业务产物，不依赖 Claude SDK 原始消息类型。
- 后续新增事件、工具策略、资源安装器时，优先新增实现类或纯函数，避免修改已稳定的核心流程。

推荐抽象：

```ts
export interface AgentRuntime {
  runAnalysis(
    input: ClaudeAnalysisInput,
    callbacks: ClaudeAnalysisCallbacks
  ): Promise<ClaudeRunResult>;
}
```

推荐依赖方向：

```text
agent-handlers.ts
  → AgentRuntime interface
  → ClaudeAgentRuntime
  → Claude Agent SDK

ClaudeAgentRuntime
  → createClaudeOptions
  → ClaudeResultExtractor
  → windhooxAgentResultSchema
  → ClaudeEventAdapter
  → ArtifactWriter
  → ClaudeSessionStore
```

最终约束：

```text
上层模块依赖 Windhoox 抽象，
Claude SDK 只存在于 src/main/claude/runtime 的实现细节中。
```

---

## 5. 目标总体架构

```text
┌─────────────────────────────────────┐
│             Renderer UI              │
│  Workbench / Conversation / Assets   │
└──────────────────┬──────────────────┘
                   │ IPC
┌──────────────────▼──────────────────┐
│              Preload API             │
│        window.windhoox.agent         │
└──────────────────┬──────────────────┘
                   │ IPC invoke / event
┌──────────────────▼──────────────────┐
│            Electron Main             │
│                                     │
│  ┌───────────────────────────────┐  │
│  │      Agent Handlers           │  │
│  │ start / continue / review     │  │
│  └───────────────┬───────────────┘  │
│                  │                  │
│  ┌───────────────▼───────────────┐  │
│  │       Claude Runtime           │  │
│  │ SDK options + event adapter    │  │
│  └───────────────┬───────────────┘  │
│                  │                  │
│  ┌───────────────▼───────────────┐  │
│  │      Claude Agent SDK          │  │
│  │ Agent / Tools / Hooks / Session│  │
│  └───────────────┬───────────────┘  │
│                  │                  │
│  ┌───────────────▼───────────────┐  │
│  │       Local Filesystem         │  │
│  │ userData / resources / traces  │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

MVP 目标链路：

```text
Renderer
→ preload.startAnalysis
→ agent:start-analysis
→ registerAgentHandlers
→ runClaudeAnalysis
→ Claude Agent SDK query
→ ClaudeResultExtractor
→ zod validate
→ ClaudeEventAdapter
→ ArtifactWriter
→ Renderer AgentEvent 展示
```

---

## 6. 目录结构规范

## 6.1 源码目录

Claude 相关源码统一收敛到 `src/main/claude/`，避免运行时、配置、安装器、安全策略分散在多个顶层目录。

```text
src/main/claude/
  runtime/
    createClaudeRuntime.ts
    createClaudeOptions.ts
    runClaudeAnalysis.ts
    ClaudeEventAdapter.ts
    ClaudeResultExtractor.ts
    ClaudeRuntimeTypes.ts

  config/
    ClaudeConfigStore.ts
    ClaudeSettingsWriter.ts
    migrateClaudeConfig.ts

  security/
    ClaudePermissionHooks.ts
    ClaudeAllowedTools.ts
    sensitivePaths.ts

  sessions/
    ClaudeSessionStore.ts
    ClaudeSessionTypes.ts

  installers/
    ClaudeSkillInstaller.ts
    ClaudeAgentInstaller.ts
```

目录职责：

| 目录 | 职责 |
|---|---|
| `runtime/` | SDK 调用、消息流消费、结果提取、事件适配 |
| `config/` | Claude 配置读写、旧配置迁移、settings 写入 |
| `security/` | allowed tools、hooks、敏感路径判断 |
| `sessions/` | Claude session id 映射和运行态 metadata |
| `installers/` | 后续安装内置 agents / skills，MVP 暂不启用 |

非 Claude 业务目录保持独立：

```text
src/main/storage/
  ArtifactWriter.ts
  SessionStore.ts
  SessionEventReplayer.ts

src/main/schemas/
  windhooxAgentResult.ts
  testcaseSchemas.ts
```

要求：

- `src/main/storage/` 不直接依赖 Claude SDK。
- `src/main/schemas/` 只定义业务 schema，不包含 SDK 消息类型。
- `src/renderer/` 不直接依赖 `src/main/claude/`。
- `src/preload/` 只暴露白名单 IPC API。

## 6.2 内置资源目录

内置 Claude 资源统一放到：

```text
resources/claude/
  agents/
    testcase-analyzer.md
    page-understanding-agent.md
    case-validator-agent.md

  skills/
    testcase-intelligent-analysis/
      SKILL.md
    login-test-reference/
      SKILL.md
    form-validation-reference/
      SKILL.md
    list-page-reference/
      SKILL.md
```

MVP 暂不接入 Skills 和 Subagents，但目录提前预留。

## 6.3 用户运行态目录

运行时 Claude 相关配置统一归入：

```text
{userData}/windhoox/claude/
  settings.json
  agents/
  skills/
  commands/
  memory/
  sessions/
    {sessionId}/
      claude-session.json
      claude-trace.json
      sdk-metadata.json
```

业务 session 独立存放：

```text
{userData}/windhoox/sessions/{sessionId}/
  input.json
  events.json
  final-result.json
  cases.json
  coverage.json
  validation.json
  trace.json
  final-output.md
  session-metadata.json
```

边界：

- `{userData}/windhoox/claude/` 存 Claude 运行态。
- `{userData}/windhoox/sessions/` 存 Windhoox 业务产物。
- 业务 session 只通过 `session-metadata.json` 引用 Claude session id，不复制 Claude session 全量内容。

---

## 7. 旧模块迁移策略

## 7.1 `agent-handlers.ts`

保留，作为 IPC 边界。

迁移后职责：

- 生成 Windhoox `sessionId`。
- 调用 `runClaudeAnalysis`。
- 将运行过程中的 `AgentEvent` 实时发送到 renderer。
- 处理 `continueAnalysis`、`reviewCase`、`loadSession`。
- 不直接调用 Claude SDK。
- 不做 JSON 解析和 schema 校验。

## 7.2 `agent-runner.ts`

第一阶段可以保留为兼容 facade，避免一次性改动过大。

建议迁移路径：

```text
Phase 1:
agent-runner.ts
  → 内部调用 src/main/claude/runtime/runClaudeAnalysis.ts

Phase 2:
agent-handlers.ts
  → 直接调用 runClaudeAnalysis.ts
  → 删除 agent-runner.ts 或改名为 legacy 文件后移除
```

最终目标：删除 `agent-runner.ts` 中所有 DeepSeek 逻辑。

## 7.3 `deepseek-client.ts`

完全移除，不保留 legacy provider。

处理要求：

- 删除 `src/main/deepseek-client.ts`。
- 删除 `src/main/deepseek-client.test.ts`。
- 删除所有 `DeepSeekError`、`chatCompletion`、`buildAnalysisPrompt` 引用。
- 测试迁移到 Claude runtime 相关测试。

## 7.4 `config.ts`

从 DeepSeek 配置迁移为 Claude 配置。

旧字段：

```ts
deepseekApiKey: string;
deepseekBaseUrl: string;
deepseekModel: string;
```

新字段：

```ts
anthropicApiKey: string;
claudeModel: string;
claudeAllowedTools: string[];
claudeLoadWorkspaceSettings: boolean;
claudeLoadUserSettings: boolean;
enableMcp: boolean;
mcpConfigPath?: string;
```

迁移策略：

- 不把 `deepseekApiKey` 自动迁移为 `anthropicApiKey`。
- 旧 `deepseek*` 字段读取后忽略。
- 保存配置时写入新结构。
- UI 中不再展示 DeepSeek 相关配置。

## 7.5 `src/types/agent.ts`

保留现有 `AgentEvent` 作为 UI 兼容协议。

需要调整：

- `AppConfig` 改为 Claude 配置。
- 补充后续事件类型时保持向后兼容。
- `CaseCandidatesEvent` 可逐步补充 `priority`、`caseType`、`tags`。

---

## 8. Claude Runtime 设计

## 8.1 Runtime 入口

建议新增：

```ts
runClaudeAnalysis(input, callbacks): Promise<ClaudeRunResult>
```

职责：

- 创建 Claude SDK options。
- 调用 Claude Agent SDK。
- 消费 SDK 消息流。
- 将过程消息转为 trace 事件。
- 提取最终 JSON。
- 校验 `WindhooxAgentResult`。
- 生成 `AgentEvent`。
- 写入 artifact。
- 返回 session metadata。

建议类型：

```ts
export interface ClaudeAnalysisInput {
  sessionId: string;
  requirementText: string;
  contextReferences?: string[];
  workspacePath?: string;
}

export interface ClaudeAnalysisCallbacks {
  onEvent: (event: AgentEvent) => void;
  onTrace?: (trace: ClaudeTraceEvent) => void;
}

export interface ClaudeRunResult {
  sessionId: string;
  claudeSessionId?: string;
  events: AgentEvent[];
  artifactPaths: AgentRunCompletedEvent["artifactPaths"];
}
```

## 8.2 `createClaudeOptions`

职责：

- 设置模型。
- 设置 API Key。
- 设置工作目录。
- 设置 allowed tools。
- 设置 hooks。
- 控制是否加载 workspace `.claude`。
- MVP 不加载用户全局 `~/.claude`。

MVP 默认工具：

```text
Read
Glob
Grep
WebFetch
```

MVP 禁用：

```text
Write
Edit
Bash
Agent
MCP
```

说明：

- `Agent` 工具留到 Phase 3 Subagents。
- MCP 留到后续阶段。
- MVP 只要求 Claude 能读取输入、输出固定 JSON。

## 8.3 `ClaudeResultExtractor`

职责：

- 从 Claude final message 中提取 JSON。
- 支持 Markdown code fence。
- 支持前后带说明文字。
- 提取失败时返回结构化错误。
- 校验失败时允许一次修复请求。

提取顺序：

```text
1. 优先识别 ```json code fence
2. 其次识别首个完整 JSON object
3. JSON.parse
4. zod validate
5. 失败则触发一次 repair prompt
6. 仍失败则 run_failed
```

## 8.4 `ClaudeEventAdapter`

职责：

- 将 Claude SDK 过程消息转为 UI trace。
- 将最终业务结果转为现有 `AgentEvent`。
- 保证 renderer 不感知 SDK 原始消息结构。

---

## 9. 输出结果协议

## 9.1 Claude 最终输出 JSON

Claude 最终必须输出固定 JSON，供 Windhoox UI 和 artifact 使用。

```ts
export interface WindhooxAgentResult {
  pageUnderstanding: {
    pageType: string;
    businessDomain?: string;
    confidence: number;
    modules: Array<{
      name: string;
      description?: string;
      elements: string[];
    }>;
    risks: Array<{
      type: string;
      description: string;
      source: string;
    }>;
  };

  insights: Array<{
    businessRule?: string;
    risk?: string;
    evidence?: string;
    confidence: "high" | "medium" | "low";
  }>;

  questions: Array<{
    id: string;
    category: "product" | "engineering" | "qa";
    question: string;
  }>;

  cases: Array<{
    id: string;
    title: string;
    description: string;
    preconditions: string[];
    steps: string[];
    expectedResult: string;
    priority?: "P0" | "P1" | "P2";
    caseType?: string;
    tags?: string[];
  }>;

  coverage: Array<{
    requirementId: string;
    caseIds: string[];
  }>;

  validation: {
    passed: boolean;
    score: number;
    missingCoverage: Array<{
      requirementId: string;
      reason: string;
    }>;
    duplicatedCases: Array<{
      caseIds: string[];
      reason: string;
    }>;
  };
}
```

## 9.2 本地 Schema 校验

Windhoox 使用 `zod` 做本地校验：

```text
Claude final message
  ↓
ClaudeResultExtractor 提取 JSON
  ↓
zod schema validate
  ↓
ClaudeEventAdapter 转 AgentEvent
  ↓
ArtifactWriter 写业务产物
```

失败策略：

- JSON 提取失败：发 `run_failed`。
- schema 校验失败：尝试一次 JSON repair。
- repair 仍失败：发 `run_failed`，保存 raw output 到 `trace.json`。

---

## 10. AgentEvent 映射协议

## 10.1 继续保留现有事件

当前 UI 已基于 `AgentEvent` 工作，MVP 继续保留：

```text
run_started
reading_sources
requirement_insight
missing_questions
case_candidates
coverage_matrix
run_completed
run_failed
case_reviewed
```

## 10.2 Claude SDK 到 AgentEvent 的映射

| Claude / Runtime 行为 | Windhoox 事件 |
|---|---|
| 开始运行 | `run_started` |
| 读取需求文本 | `reading_sources`，source 为 `requirement-text` |
| 读取 context references | `reading_sources`，source 为引用路径或 URL |
| 最终 JSON 中的 `insights` | 多个 `requirement_insight` |
| 最终 JSON 中的 `questions` | `missing_questions` |
| 最终 JSON 中的 `cases` | `case_candidates` |
| 最终 JSON 中的 `coverage` | `coverage_matrix` |
| artifact 写入完成 | `run_completed` |
| SDK 错误 / 校验失败 | `run_failed` |
| 用户评审用例 | `case_reviewed` |

## 10.3 后续增强事件

后续可新增事件，但不得破坏现有 UI：

```text
agent_step_started
agent_step_completed
tool_used
memory_loaded
validation_completed
artifact_written
skill_used
subagent_started
subagent_completed
```

阶段约束：

- MVP 可先不暴露这些增强事件。
- Phase 2 后再引入 `skill_used`。
- Phase 3 后再引入 `subagent_started`、`subagent_completed`。

---

## 11. IPC 设计

## 11.1 Preload API

MVP 保留：

```ts
window.windhoox.agent = {
  startAnalysis,
  continueAnalysis,
  reviewCase,
  loadSession,
  getConfig,
  setConfig,
  onEvent
}
```

Phase 2 再新增：

```ts
listSkills,
importSkill,
enableSkill,
disableSkill
```

Phase 3 再新增：

```ts
listAgents,
enableAgent,
disableAgent
```

## 11.2 `startAnalysis`

```text
Renderer
→ agent:start-analysis
→ Main 创建 Windhoox sessionId
→ runClaudeAnalysis
→ Claude SDK query
→ SDK 消息 / final JSON 转 AgentEvent
→ 写入 artifact
→ Renderer 实时展示
```

## 11.3 `continueAnalysis`

Phase 4 接入 Claude SDK session resume。

```text
读取 Windhoox previous session
→ 读取 Claude session id
→ 组装用户反馈
→ Claude SDK resume
→ 生成增量结果
→ 写入新 session
```

MVP 可保留占位，但必须返回明确错误或未支持状态，不能静默成功。

## 11.4 `reviewCase`

`reviewCase` 是 Windhoox 业务状态，不由 Claude SDK 管理。

```text
更新 cases.json
→ 写入 business-memory
→ 发 case_reviewed
```

MVP 可以先只更新内存状态；Phase 5 必须持久化。

## 11.5 `loadSession`

```text
读取 sessions/{sessionId}/events.json
→ 返回事件列表
→ Renderer 回放 AgentEvent
```

MVP 如果 Artifact 已落地，应同步实现。

---

## 12. Claude 配置体系

## 12.1 配置来源

配置来源：

```text
1. Windhoox 内置默认配置
2. .env.local，开发环境优先
3. {userData}/config.json，用户保存配置
4. {userData}/windhoox/claude/settings.json，Claude Code 兼容配置
```

`.env.local` 支持：

```text
ANTHROPIC_API_KEY=
CLAUDE_MODEL=
```

不再支持新的 DeepSeek 配置写入。

## 12.2 `AppConfig`

```ts
export interface AppConfig {
  anthropicApiKey: string;
  claudeModel: string;

  claudeAllowedTools: string[];
  claudeLoadWorkspaceSettings: boolean;
  claudeLoadUserSettings: boolean;

  enableMcp: boolean;
  mcpConfigPath?: string;
}
```

MVP 默认值：

```ts
const DEFAULT_CONFIG: AppConfig = {
  anthropicApiKey: "",
  claudeModel: "claude-sonnet-4-5",
  claudeAllowedTools: ["Read", "Glob", "Grep", "WebFetch"],
  claudeLoadWorkspaceSettings: true,
  claudeLoadUserSettings: false,
  enableMcp: false,
};
```

## 12.3 配置 UI

MVP 设置页只需要：

- Anthropic API Key
- Claude 模型
- 是否加载 workspace `.claude`
- allowed tools 简单开关或只读展示

---

## 13. Agent / Skill 设计

## 13.1 MVP 阶段

MVP 不接入 Skills 和 Subagents。

MVP 使用单一 Claude prompt 完成：

- 需求理解
- 风险识别
- 用例生成
- 覆盖矩阵生成
- 校验信息生成
- 固定 JSON 输出

原因：

- 先降低迁移复杂度。
- 先验证 Claude Agent SDK 在 Electron Main 中可稳定运行。
- 先打通配置、事件、schema、artifact 主链路。

## 13.2 Phase 2：Skills

Skill 使用 Claude Code 原生格式：

```text
.claude/skills/{skill-name}/SKILL.md
```

Windhoox 负责：

- 安装内置 Skill 到 Claude 配置目录。
- 导入用户本地 Skill。
- 删除用户导入 Skill。
- 启用 / 禁用 Skill。
- 展示 Skill 名称、描述、来源。

Windhoox 不负责：

- 自研 Skill 路由。
- 自研 Skill 执行。
- 自研 Skill memory。
- 自研 Skill tool loop。

内置 Skills：

```text
testcase-intelligent-analysis
login-test-reference
form-validation-reference
list-page-reference
testcase-validator
markdown-testcase-formatter
```

## 13.3 Phase 3：Subagents

自定义 Agent 使用 Claude Agent SDK / Claude Code 原生 subagents 能力。

内置 Agents：

```text
testcase-analyzer
page-understanding-agent
case-validator-agent
```

Windhoox 只提供：

- 内置 agent 定义文件。
- agent 安装 / 删除 / 启用 / 禁用 UI。
- agent 文件写入指定 Claude 配置目录。
- allowed tools 安全配置。

---

## 14. Memory / Resume 设计

## 14.1 Project Memory

位置：

```text
{workspace}/CLAUDE.md
{workspace}/.claude/CLAUDE.md
```

内容：

- 项目业务背景
- 测试规范
- 术语解释
- 用例格式约定
- 禁止事项

MVP 默认可加载 workspace memory，但不加载用户全局 `~/.claude`。

## 14.2 Session Memory

由 Claude Agent SDK 管理。

用途：

- 当前会话上下文
- 已读文件
- 已完成分析
- 上一轮结果

Phase 4 使用 SDK session resume 实现 `continueAnalysis`。

## 14.3 Windhoox Business Memory

这不是 Agent 框架 memory，而是业务数据，用于沉淀用户评审结果。

位置：

```text
{userData}/windhoox/business-memory/
```

内容：

- accepted case ids
- rejected case ids
- unresolved questions
- 用户偏好
- 用例修改记录

这些数据在继续分析时，以用户反馈形式传给 Claude Agent SDK，而不是自研 memory engine。

---

## 15. Artifact 与 Session 设计

## 15.1 ArtifactWriter

`ArtifactWriter` 负责确定性写入业务产物。

输入：

- `AnalysisPayload`
- `AgentEvent[]`
- `WindhooxAgentResult`
- raw Claude output
- trace events
- Claude session metadata

输出：

```text
{userData}/windhoox/sessions/{sessionId}/
  input.json
  events.json
  final-result.json
  cases.json
  coverage.json
  validation.json
  trace.json
  final-output.md
  session-metadata.json
```

## 15.2 SessionStore

`SessionStore` 负责业务 session 的列表、读取和回放。

接口建议：

```ts
listSessions(): Promise<SessionSummary[]>
loadSession(sessionId: string): Promise<AgentEvent[]>
getSessionMetadata(sessionId: string): Promise<SessionMetadata>
```

## 15.3 ClaudeSessionStore

`ClaudeSessionStore` 只保存 Claude 运行态 metadata。

```text
{userData}/windhoox/claude/sessions/{sessionId}/
  claude-session.json
  claude-trace.json
  sdk-metadata.json
```

---

## 16. 安全设计

## 16.1 MVP 默认安全策略

默认：

- 不允许 `Bash`。
- 不允许 `Write`。
- 不允许 `Edit`。
- 不允许 `Agent`。
- 不启用 MCP。
- 不加载用户全局 `~/.claude`。
- 不允许访问 workspace 外文件，除非用户显式输入 URL 或文本。
- 不允许读取敏感路径。

## 16.2 敏感路径

禁止读取：

```text
~/.ssh
~/.aws
~/.npmrc
~/.git-credentials
.env
.env.local
*.pem
*.key
```

## 16.3 后续权限模式

```text
Safe Mode
  Read / Glob / Grep / WebFetch only

Project Mode
  允许读取 workspace 内文件
  允许 AskUserQuestion / Agent

Advanced Mode
  用户显式开启 Write / Edit / MCP / Bash 白名单
```

---

## 17. Electron 打包资源策略

内置 Claude 资源位于：

```text
resources/claude/
```

开发环境读取：

```text
{projectRoot}/resources/claude/
```

生产环境读取：

```text
process.resourcesPath/claude/
```

`electron-builder.yml` 需要确保复制：

```yaml
extraResources:
  - from: resources/claude
    to: claude
```

首次启动或首次使用时：

```text
process.resourcesPath/claude
→ {userData}/windhoox/claude/
```

MVP 如果暂不启用 Skills / Agents，可以先只完成路径工具函数和打包配置预留。

---

## 18. 测试策略

## 18.1 单元测试

必须覆盖：

| 模块 | 测试点 |
|---|---|
| `ClaudeResultExtractor` | code fence JSON、纯 JSON、前后有说明、坏 JSON |
| `windhooxAgentResultSchema` | 合法结果、缺字段、错误枚举、空数组 |
| `ClaudeEventAdapter` | result 到 `AgentEvent` 的映射 |
| `ClaudeConfigStore` | 默认值、`.env.local`、磁盘配置、mask key |
| `ClaudePermissionHooks` | 禁用 Bash、禁用 Write/Edit、敏感路径 |
| `ArtifactWriter` | 文件写入、路径生成、metadata 引用 |

## 18.2 集成测试

必须覆盖：

- `agent:start-analysis` 返回 `sessionId`。
- 成功运行后发送 `run_started` 和 `run_completed`。
- Claude 返回非法 JSON 时发送 `run_failed`。
- Artifact 文件真实存在。
- `loadSession` 可以回放 `events.json`。

## 18.3 测试 Fixture

建议新增：

```text
test-fixtures/claude/
  valid-final-result.json
  invalid-final-result.json
  final-message-with-code-fence.md
  final-message-with-extra-text.md
```

---

## 19. 分阶段实施计划

## Phase 1：Claude SDK MVP 接入

目标：完全替换 DeepSeek，让 Claude Agent SDK 在 Electron Main 中跑通，并保持现有 UI 可用。

任务：

- 安装 `@anthropic-ai/claude-agent-sdk`。
- 新增 `src/main/claude/runtime/`。
- 实现 `createClaudeOptions`。
- 实现 `runClaudeAnalysis`。
- 实现 `ClaudeResultExtractor`。
- 实现 `ClaudeEventAdapter`。
- 新增 `src/main/schemas/windhooxAgentResult.ts`。
- 改造 `agent-runner.ts` 为 Claude facade，或让 `agent-handlers.ts` 直接调用 `runClaudeAnalysis`。
- 删除 DeepSeek 调用链。
- 保持现有 UI 事件协议。

验收：

- 点击开始分析能调用 Claude Agent SDK。
- UI 能展示 insights / questions / cases / coverage。
- Claude 输出非法 JSON 时能转为 `run_failed`。
- 不再依赖 `deepseek-client.ts`。

## Phase 1.5：Artifact / Session 最小持久化

目标：分析结果真实落盘，支持基础 session 回放。

任务：

- 实现 `ArtifactWriter`。
- 实现 `SessionStore`。
- 写入 `input.json`、`events.json`、`final-result.json`。
- 实现 `loadSession`。
- `run_completed.artifactPaths` 返回真实路径。

验收：

- 分析结束后真实文件存在。
- 重启应用可加载历史事件。
- `/tmp` 假路径全部移除。

## Phase 2：Claude Skills 接入

目标：使用 SDK 原生 Skill 管理。

任务：

- 新增 `resources/claude/skills`。
- 实现 `ClaudeSkillInstaller`。
- 安装内置 skills 到 `{userData}/windhoox/claude/skills`。
- 支持加载 workspace `.claude/skills`。
- 提供 `listSkills` API。
- 提供 `enableSkill / disableSkill`。

验收：

- 修改 Skill 文档能影响结果。
- UI 能看到当前可用 Skill。
- Agent 可使用 Skill 生成用例。

## Phase 3：自定义 Agent / Subagents 接入

目标：使用 SDK 原生 Subagent 能力。

任务：

- 新增 `resources/claude/agents`。
- 实现 `ClaudeAgentInstaller`。
- 安装 agents 到 Claude 配置目录。
- 允许主 Agent 调用子 Agent。
- 展示 subagent trace。

验收：

- 子 Agent 执行过程可追踪。
- 页面理解和用例校验可由不同 subagent 完成。

## Phase 4：Memory / Resume

目标：使用 SDK session resume 完成继续分析。

任务：

- 保存 Claude session id。
- 实现 `ClaudeSessionStore`。
- `continue-analysis` 调用 SDK resume。
- `review-case` 写业务反馈。
- 继续分析时传入 accepted / rejected / unresolved questions。

验收：

- 继续分析能基于上一轮上下文。
- 用户拒绝过的用例不会重复出现。
- Claude session 和 Windhoox session 关联清晰。

## Phase 5：Hooks / 权限 / 审计完善

目标：发布级安全控制。

任务：

- 实现 `ClaudePermissionHooks`。
- 限制敏感路径。
- 禁止危险工具。
- 写审计日志。
- UI 展示工具调用记录。

验收：

- Agent 不能读取敏感文件。
- Agent 不能执行 Bash。
- 工具调用可审计。

---

## 20. MVP 范围

## 20.1 MVP 必须包含

- Claude Agent SDK 在 Electron Main 中运行。
- 完全移除 DeepSeek 调用链。
- Anthropic API Key 配置。
- Claude 模型配置。
- Claude final JSON 输出。
- `zod` 校验结果。
- 转换为现有 `AgentEvent`。
- UI 展示 insights、问题、用例、覆盖矩阵。
- 错误转为 `run_failed`。
- 禁用 Bash / Write / Edit。

## 20.2 MVP 不包含

- Skills。
- Subagents。
- MCP。
- Session resume。
- 多模型 provider。
- 复杂自研 memory。
- Excel / Jira / 禅道导出。
- 完整权限模式 UI。

---

## 21. 与旧方案差异

旧方案：

```text
Windhoox agent-runner.ts
→ buildAnalysisPrompt
→ DeepSeek Chat Completion
→ JSON.parse
→ AgentEvent[]
```

新方案：

```text
Windhoox Claude Runtime
→ Claude Agent SDK
→ SDK message stream
→ ClaudeResultExtractor
→ zod schema validate
→ ClaudeEventAdapter
→ ArtifactWriter
```

核心收益：

- 完全移除 DeepSeek 单次 JSON 生成模式。
- 直接复用 Claude Agent SDK 的 Agent 能力。
- 为 Skills、Subagents、Session Resume、Hooks、MCP 留出原生扩展路径。
- 保留 Windhoox 当前已经成型的 Electron UI、IPC 和测试资产工作流。
- 代码目录边界更清晰，Claude 相关能力统一收敛。

---

## 22. 最终结论

Windhoox 应采用：

```text
Claude Agent SDK First Architecture
```

最终技术定位：

```text
Windhoox 不是自研 Agent 框架，
而是基于 Claude Agent SDK 的本地测试用例 Agent 工作台。
```

职责边界：

```text
Claude Agent SDK：Agent 能力内核
Windhoox：测试用例业务产品层
```

落地顺序必须先保证 MVP 主链路闭环：

```text
Claude SDK 调用
→ 固定 JSON 输出
→ schema 校验
→ AgentEvent 适配
→ UI 展示
→ 错误处理
```

Skills、Subagents、Memory Resume、MCP 都作为后续阶段，不阻塞 MVP。