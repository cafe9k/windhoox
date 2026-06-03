# Core Execution Flows

> 基于 GitNexus 知识图谱自动分析，上次更新: 2026-06-03 (commit 11bcef4)
> 运行 `node scripts/update-core-flows.mjs` 刷新数据

---

## 评判规则

### 数据来源

所有指标从 GitNexus 知识图谱中提取，使用 Cypher 查询：

| 指标 | 含义 |
|------|------|
| **出度 (OD)** | 一个符号调用了多少其他符号 — 编排能力 |
| **入度 (ID)** | 一个符号被多少其他符号调用 — 基础设施依赖度 |
| **最大步骤数 (MS)** | 从该入口出发的最长执行链长度 |
| **跨社区数 (CC)** | 执行链贯穿了多少个功能社区 |

### 核心度评分公式

```
coreScore = OD × 1 + MS × 2 + CC × 3
```

### 等级划分

| 等级 | coreScore 范围 | 含义 |
|------|---------------|------|
| **P0 核心流程** | ≥ 15 | 项目的核心价值交付链路，改动需最高审慎度 |
| **P1 支撑流程** | 8–14 | 辅助核心流程运转，改动需中等审慎度 |
| **P2 工具流程** | < 8 | 局部功能或工具链，改动影响有限 |

### 流程入口识别规则

满足以下条件之一的符号视为**流程入口**：
1. 非测试文件中出度 ≥ 3 的 Function/Method
2. 作为 Process 的第一步 (step: 1) 出现
3. IPC handler 的注册函数

---

## 当前核心流程排行

### P0 核心流程 (coreScore ≥ 15)

#### 1. AI 分析主流程 — coreScore: 39

| 指标 | 值 |
|------|---|
| 入口符号 | `registerAgentHandlers` |
| 文件 | `src/main/agent-handlers.ts` |
| 出度 (OD) | 15 |
| 最大步骤数 (MS) | 6 |
| 跨社区数 (CC) | 4 |

**涉及 Process**: RegisterAgentHandlers → EnsurePaths (6步), RegisterAgentHandlers → LoadEnvLocal (5步), RegisterAgentHandlers → BuildSources (5步), RegisterAgentHandlers → ClaudeRuntime (3步)

> 用户输入需求 → Claude API 调用 → 结果提取 → 事件转换 → Artifact 持久化 → UI 渲染。项目核心价值链路。

---

#### 2. Artifact 持久化流程 — coreScore: 20

| 指标 | 值 |
|------|---|
| 入口符号 | `writeAll` |
| 文件 | `src/main/storage/ArtifactWriter.ts` |
| 出度 (OD) | 10 |
| 最大步骤数 (MS) | 5 |
| 跨社区数 (CC) | 0 |

**涉及 Process**: WriteAll → GetSessionDir (5步), Write* → GetSessionDir (4步 × 7)

> AI 分析完成后写入 6 个 artifact 文件。被 registerAgentHandlers 内部调用，非独立用户入口。

---

#### 3. 配置管理流程 — coreScore: 19

| 指标 | 值 |
|------|---|
| 入口符号 | `handleSave / getConfigMasked` |
| 文件 | `src/renderer/features/workbench/AIConfigModal.tsx + src/main/config.ts` |
| 出度 (OD) | 3 |
| 最大步骤数 (MS) | 5 |
| 跨社区数 (CC) | 2 |

**涉及 Process**: HandleSave → EnsurePaths (5步), GetConfigMasked → EnsurePaths (5步), HandleSave → LoadEnvLocal (4步), GetConfigMasked → BuildSources (4步)

> 用户修改 AI 配置 → IPC 保存 → 下次分析使用新配置。包含 .env.local 优先级和磁盘持久化。


---

### P1 支撑流程 (coreScore 8–14)

#### 4. 会话加载流程 — coreScore: 11

| 指标 | 值 |
|------|---|
| 入口符号 | `loadSession` |
| 文件 | `src/main/storage/SessionStore.ts` |
| 出度 (OD) | 3 |
| 最大步骤数 (MS) | 4 |
| 跨社区数 (CC) | 0 |

**涉及 Process**: LoadSession → GetSessionDir (4步), ListSessions → GetSessionDir (4步)

> 用户点击历史会话 → 读取 userData 目录 → 还原 events + artifacts → UI 展示。


---

### P2 工具流程 (coreScore < 8)

#### 5. 用例评审流程 — coreScore: 2

| 指标 | 值 |
|------|---|
| 入口符号 | `agent:review-case` |
| 文件 | `src/main/agent-handlers.ts` |
| 出度 (OD) | 0 |
| 最大步骤数 (MS) | 1 |
| 跨社区数 (CC) | 0 |

**涉及 Process**: 

> ⏳ stub — 仅返回 { success: true }，待实现。

---

#### 6. 继续分析流程 — coreScore: 2

| 指标 | 值 |
|------|---|
| 入口符号 | `agent:continue-analysis` |
| 文件 | `src/main/agent-handlers.ts` |
| 出度 (OD) | 0 |
| 最大步骤数 (MS) | 1 |
| 跨社区数 (CC) | 0 |

**涉及 Process**: 

> ⏳ stub — 返回 '后续版本实现'，待实现。


---

## 更新日志

| 日期 | Commit | 变更 |
|------|--------|------|
| 2026-06-03 | 11bcef4 | 自动更新: 3 P0 + 1 P1 + 2 P2 |

