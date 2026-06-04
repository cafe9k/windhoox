# Core Execution Flows

> 基于代码库实际结构人工整理，上次更新: 2026-06-04 (Phase 4 完成后)

---

## 评判规则

### 数据来源

所有指标从当前代码库的实际调用链中提取：

| 指标 | 含义 |
|------|------|
| **出度 (OD)** | 一个符号直接调用了多少其他符号/模块 — 编排能力 |
| **最大步骤数 (MS)** | 从该入口出发的最长同步/异步执行链长度 |
| **跨社区数 (CC)** | 执行链贯穿了多少个功能社区 (IPC / Runtime / Storage / Schema / Renderer) |

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
2. 作为用户交互触点的第一步出现
3. IPC handler 的注册函数

---

## 当前核心流程排行

### P0 核心流程 (coreScore ≥ 15)

#### 1. AI 分析主流程 — coreScore: 43

| 指标 | 值 |
|------|---|
| **入口符号** | `registerAgentHandlers` |
| **文件** | `src/main/agent-handlers.ts` |
| **出度 (OD)** | 17 |
| **最大步骤数 (MS)** | 8 |
| **跨社区数 (CC)** | 5 |

**涉及 Process**:
- `agent:start-analysis` → `createAgentRuntime()` → `ClaudeAgentRuntime.runAnalysis()` → `ClaudeRuntime.startAnalysis()` → `extractStructuredResult()` → `EventAdapter.resultToAgentEvents()` → `ArtifactWriter.writeAll()` → `sendEvent()` → Renderer
- `agent:continue-analysis` → `ClaudeAgentRuntime.continueAnalysis()` → `SessionStore.loadSession()` → `buildContinuationPrompt()` → `ClaudeRuntime.startAnalysis()` → 同上流水线
- `agent:cancel-analysis` → `AbortController.abort()`
- `agent:list-sessions` → `SessionStore.listSessions()`
- `agent:load-session` → `SessionStore.loadSession()`

**详细链路**:

```
Renderer (WorkbenchPage.handleStartAnalysis)
  ↓ IPC invoke
agent:start-analysis handler
  ↓
createAgentRuntime()
  → createClaudeRuntimeFromConfig() [从 config.ts 读取 API Key / baseURL / model]
  → new ClaudeAgentRuntime(claudeRuntime)
  ↓
ClaudeAgentRuntime.runAnalysis(input, onEvent, { signal })
  ├─→ onEvent(createRunStartedEvent) ───────────────→ Renderer (agent:event)
  ├─→ onEvent(createReadingSourceEvents) ────────────→ Renderer
  ├─→ claudeRuntime.startAnalysis({ requirementText }, {}, signal)
  │     ├─→ Anthropic SDK messages.create() 或 messages.parse() 或 messages.stream()
  │     ├─→ 支持三种模式: Standard / Structured Output / Streaming
  │     └─→ 返回 Message (含 usage tokens)
  ├─→ extractStructuredResult(message)
  │     ├─→ Path 1: parsed_output (structured output via output_config.format)
  │     └─→ Path 2: extractFinalText → extractResultWithRetry (code fence / JSON object / repair)
  ├─→ eventAdapter.resultToAgentEvents(data, sessionId)
  │     └─→ 生成: requirement_insight × N, missing_questions, case_candidates, coverage_matrix
  ├─→ onEvent(businessEvents) ───────────────────────→ Renderer
  ├─→ artifactWriter.writeAll(sessionId, ...events, result, trace, metadata)
  │     └─→ 写入 9 个文件到 {userData}/windhoox/sessions/{sessionId}/
  │         ├── input.json, events.json, final-result.json, cases.json
  │         ├── coverage.json, validation.json, trace.json
  │         ├── final-output.md (markdown summary)
  │         └── session-metadata.json (含 previousSessionId 用于链式追踪)
  └─→ onEvent(run_completed with artifactPaths) ─────→ Renderer
```

**继续分析子链路**:

```
agent:continue-analysis handler
  ↓
ClaudeAgentRuntime.continueAnalysis(input, onEvent, { signal })
  ├─→ sessionStore.loadSession(previousSessionId)
  │     └─→ 读取 session-metadata.json + events.json
  ├─→ buildContinuationPrompt(requirement, prevSession, feedback, tokenBudget)
  │     ├─→ 组装: 原始需求 + 上一轮 insights + cases + questions + 用户反馈
  │     ├─→ estimateTokens() ─ 中文字符≈1 token, ASCII≈0.25 token
  │     └─→ 若超 tokenBudget: 依次裁剪 insights → questions → case summaries
  ├─→ claudeRuntime.startAnalysis({ requirementText: continuationPrompt })
  └─→ 后续同 runAnalysis 流水线 (提取 → 转事件 → 写 Artifact → run_completed)
```

> 用户输入需求 → Claude API 调用 → 结果提取 → 事件转换 → Artifact 持久化 → UI 渲染。项目核心价值链路。Phase 4 新增了继续分析能力（基于上一轮会话反馈重新生成结果）。

---

#### 2. Artifact 持久化流程 — coreScore: 20

| 指标 | 值 |
|------|---|
| **入口符号** | `ArtifactWriter.writeAll` |
| **文件** | `src/main/storage/ArtifactWriter.ts` |
| **出度 (OD)** | 10 |
| **最大步骤数 (MS)** | 5 |
| **跨社区数 (CC)** | 0 |

**涉及 Process**: `writeAll` → `writeFinalOutput` → `generateMarkdownSummary` → `writeJson` → `ensureSessionDir` → `getSessionDir` → `fs.writeFileSync`

**写入文件清单** (9 个):

| 文件 | 内容 | 调用方法 |
|------|------|----------|
| `input.json` | 原始需求 + 上下文引用 | `writeInput()` |
| `events.json` | 所有 AgentEvent 数组 | `writeEvents()` |
| `final-result.json` | 提取的 WindhooxAgentResult | `writeFinalResult()` |
| `cases.json` | 生成的测试用例 | `writeCases()` |
| `coverage.json` | 覆盖矩阵 | `writeCoverage()` |
| `validation.json` | 验证结果 | `writeValidation()` |
| `trace.json` | Claude API 原始响应 | `writeTrace()` |
| `final-output.md` | Markdown 摘要 | `writeFinalOutput()` → `generateMarkdownSummary()` |
| `session-metadata.json` | SessionMetadata (含 previousSessionId) | `writeMetadata()` |

> AI 分析完成后写入 9 个 artifact 文件。被 `registerAgentHandlers` 内部调用，非独立用户入口。Session 目录结构支持多轮对话链式追踪。

---

### P1 支撑流程 (coreScore 8–14)

#### 3. 配置管理流程 — coreScore: 19

| 指标 | 值 |
|------|---|
| **入口符号** | `handleSave / getConfigMasked` |
| **文件** | `src/renderer/features/workbench/AIConfigModal.tsx` + `src/main/config.ts` |
| **出度 (OD)** | 3 |
| **最大步骤数 (MS)** | 5 |
| **跨社区数 (CC)** | 2 |

**涉及 Process**:
- `handleSave` → `agent:set-config` → `setConfig()` → `saveToDisk()` → `ensurePaths()` → `fs.writeFileSync`
- `getConfigMasked` → `getConfigWithSources()` → `getConfig()` → `loadFromDisk()` / `loadEnvLocal()` → `buildSources()`

**配置优先级** (从高到低):
1. `.env.local` (开发环境) — `CLAUDE_API_KEY`, `CLAUDE_BASE_URL`, `CLAUDE_MODEL`, `CLAUDE_MAX_TOKENS`, `CLAUDE_TEMPERATURE`
2. 持久化配置 `userData/config.json`
3. 默认值 (`DEFAULT_CONFIG`: model=claude-sonnet-4-5, maxTokens=8000, temperature=0.3)

> 用户修改 AI 配置 → IPC 保存 → 下次分析使用新配置。包含 `.env.local` 优先级和磁盘持久化。`maxTokens` 同时作为继续分析的默认 token 预算。

---

#### 4. 会话加载流程 — coreScore: 11

| 指标 | 值 |
|------|---|
| **入口符号** | `SessionStore.loadSession` |
| **文件** | `src/main/storage/SessionStore.ts` |
| **出度 (OD)** | 3 |
| **最大步骤数 (MS)** | 4 |
| **跨社区数 (CC)** | 0 |

**涉及 Process**: `loadSession` → `loadMetadata` → `loadEvents` → `readJson` → `getSessionDir`

> 用户点击历史会话 → 读取 userData 目录 → 还原 events + artifacts → UI 展示。被继续分析流程内部调用以加载上一轮数据。

---

#### 5. 会话列表流程 — coreScore: 11

| 指标 | 值 |
|------|---|
| **入口符号** | `SessionStore.listSessions` |
| **文件** | `src/main/storage/SessionStore.ts` |
| **出度 (OD)** | 3 |
| **最大步骤数 (MS)** | 4 |
| **跨社区数 (CC)** | 0 |

**涉及 Process**: `listSessions` → `fs.readdirSync` → `loadMetadata` → `readJson` → `getSessionDir`

**调用链路**:
```
Renderer (WorkbenchPage.refreshSessions)
  ↓ IPC invoke
agent:list-sessions handler
  ↓
SessionStore.listSessions()
  ├─→ fs.readdirSync(sessionsDir)
  ├─→ 遍历目录 → loadMetadata(sessionId)
  ├─→ 按 createdAt 降序排序 (最新在前)
  └─→ 返回 SessionMetadata[]
```

> 应用启动或分析完成后，WorkbenchPage 自动刷新左侧会话列表。返回的 `previousSessionId` 用于在 `LeftContextPanel` 中构建缩进链式可视化。

---

### P2 工具流程 (coreScore < 8)

#### 6. 取消分析流程 — coreScore: 5

| 指标 | 值 |
|------|---|
| **入口符号** | `agent:cancel-analysis` |
| **文件** | `src/main/agent-handlers.ts` |
| **出度 (OD)** | 1 |
| **最大步骤数 (MS)** | 2 |
| **跨社区数 (CC)** | 0 |

**涉及 Process**: `agent:cancel-analysis` → `activeControllers.get(sessionId)` → `controller.abort()`

> 每个分析会话创建时生成一个 `AbortController`，存入 `activeControllers` Map。取消时调用 `abort()`，Claude SDK 的 `signal` 参数会中断正在进行的 API 请求。AbortError 被 `ClaudeAgentRuntime` 捕获并转为 `run_failed` 事件（error="分析已取消", recoverable=false）。

---

#### 7. 用例评审流程 — coreScore: 2

| 指标 | 值 |
|------|---|
| **入口符号** | `agent:review-case` |
| **文件** | `src/main/agent-handlers.ts` |
| **出度 (OD)** | 0 |
| **最大步骤数 (MS)** | 1 |
| **跨社区数 (CC)** | 0 |

**涉及 Process**: (无)

> ⏳ stub — 仅返回 `{ success: true }`，本地状态通过 `agentStateReducer` 的 `case_reviewed` 事件更新，待实现服务端持久化。

---

## 完整 IPC 接口清单

| Channel | 方向 |  payload | 响应 | 状态 |
|---------|------|----------|------|------|
| `agent:start-analysis` | Renderer → Main | `{ requirementText, contextReferences? }` | `{ sessionId }` | ✅ 已实现 |
| `agent:continue-analysis` | Renderer → Main | `{ sessionId, previousSessionId, feedback, tokenBudget? }` | `{ sessionId }` | ✅ 已实现 |
| `agent:cancel-analysis` | Renderer → Main | `{ sessionId }` | `{ success, reason? }` | ✅ 已实现 |
| `agent:review-case` | Renderer → Main | `{ sessionId, caseId, status }` | `{ success }` | ⏳ stub |
| `agent:load-session` | Renderer → Main | `{ sessionId }` | `{ success, sessionId?, events?, paths? }` | ✅ 已实现 |
| `agent:list-sessions` | Renderer → Main | (none) | `SessionMetadata[]` | ✅ 已实现 |
| `agent:get-config` | Renderer → Main | (none) | `AppConfig` (masked API key) | ✅ 已实现 |
| `agent:set-config` | Renderer → Main | `Partial<AppConfig>` | `AppConfig` | ✅ 已实现 |
| `agent:event` | Main → Renderer | `AgentEvent` | (event stream) | ✅ 已实现 |

---

## AgentEvent 类型演进

```
run_started              ──→ 分析开始
reading_sources          ──→ 正在读取需求/上下文
requirement_insight      ──→ 发现业务规则/风险/证据
missing_questions        ──→ 待澄清问题
case_candidates          ──→ 候选用例生成
coverage_matrix          ──→ 覆盖矩阵
run_completed            ──→ 分析完成 (含 artifactPaths)
run_failed               ──→ 分析失败 (含 recoverable, retryEligible)
case_reviewed            ──→ 用例状态变更 (本地状态更新)
run_continued            ──→ [Phase 4 新增] 继续分析启动 (含 previousSessionId)
```

---

## 更新日志

| 日期 | Commit/变更 | 说明 |
|------|-------------|------|
| 2026-06-03 | 11bcef4 | 自动更新: 3 P0 + 1 P1 + 2 P2 |
| 2026-06-04 | Phase 4 完成 | **重大更新**: 继续分析流程从 stub 变为完整实现; 新增 `agent:cancel-analysis`; 新增 `agent:list-sessions`; 新增 token 预算控制; 新增 session chain 可视化; 新增 `run_continued` 事件类型; ArtifactWriter 写入文件从 6 个增至 9 个（新增 input.json / trace.json / session-metadata.json） |
