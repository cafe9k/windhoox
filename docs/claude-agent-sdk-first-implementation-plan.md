# Windhoox Claude Agent SDK First 具体实施文档

本文基于 `docs/claude-agent-sdk-first-architecture.md`，用于把 Claude Agent SDK First 架构拆成可顺序执行、可测试、可回滚的实施步骤。

核心规则：

- 严格按步骤执行。
- 每一步只做该步骤声明的改动。
- 每一步完成后必须跑完整测试门禁。
- 测试全部成功后才能进入下一步。
- 任一步失败时，先修复当前步骤，不把问题带到下一步。
- 修改函数、类或方法前必须按 `AGENTS.md` 执行 GitNexus impact analysis。
- 提交前必须执行 GitNexus detect changes，确认影响范围符合预期。

---

## 0. 实施总览

### 目标终态

当前链路：

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
→ Renderer
```

目标链路：

```text
Renderer
→ preload.startAnalysis
→ agent:start-analysis
→ agent-handlers.ts
→ AgentRuntime interface
→ ClaudeAgentRuntime
→ Claude Agent SDK query
→ ClaudeResultExtractor
→ windhooxAgentResultSchema
→ ClaudeEventAdapter
→ ArtifactWriter
→ AgentEvent[]
→ Renderer
```

### 步骤清单

| 步骤 | 名称 | 主要结果 |
|---|---|---|
| Step 1 | 基线确认与测试夹具准备 | 当前测试绿灯，Claude fixture 就绪 |
| Step 2 | 业务 Schema 与结果提取器 | 可校验 Claude 固定 JSON 输出 |
| Step 3 | 事件适配器 | `WindhooxAgentResult` 可稳定转 `AgentEvent` |
| Step 4 | Claude 配置迁移 | `AppConfig` 从 DeepSeek 切到 Claude |
| Step 5 | Claude Runtime 骨架 | 建立 SDK 隔离层和可 mock 的 runtime |
| Step 6 | IPC 分析链路切换 | `agent:start-analysis` 改走 Claude runtime |
| Step 7 | Artifact 与 Session 持久化 | 真实落盘，支持 `loadSession` 回放 |
| Step 8 | Renderer 配置与错误态适配 | UI 不再出现 DeepSeek 配置 |
| Step 9 | 移除 DeepSeek legacy | 删除 DeepSeek client 与旧测试 |
| Step 10 | 打包资源与预留目录 | Claude resources 和 builder 配置就绪 |
| Step 11 | 发布级总验收 | 全链路、回归、安全检查完成 |

---

## 1. 统一执行规范

### 1.1 每步开始前

执行：

```bash
git status --short
```

要求：

- 记录当前工作区状态。
- 不回滚用户已有改动。
- 如当前步骤会修改函数、类或方法，先运行 GitNexus impact analysis。

示例：

```text
gitnexus_impact({
  target: "runLocalAgent",
  direction: "upstream",
  repo: "windhoox"
})
```

如 impact 返回 HIGH 或 CRITICAL：

- 先暂停该步骤。
- 向维护者说明直接调用者、影响流程和风险。
- 获得确认后再继续。

### 1.2 每步完成后的完整测试门禁

默认每一步都必须执行：

```bash
pnpm test
pnpm typecheck
pnpm build
```

涉及 renderer、preload、IPC 或 Electron 行为时，额外执行：

```bash
pnpm test:renderer
pnpm test:electron
npx playwright test e2e/verify-analysis-flow.spec.ts
```

涉及真实 Claude SDK 调用时，至少执行一次手动冒烟：

```bash
pnpm dev
```

并在应用中验证：

- 能打开设置页。
- 能保存 Claude 配置。
- 能发起分析。
- 能收到 `run_started`。
- 成功时能收到 `run_completed`。
- 失败时能收到 `run_failed`，且 UI 不崩溃。

进入下一步的硬条件：

- 所有自动化测试通过。
- 类型检查通过。
- 构建通过。
- 本步骤新增或修改的核心逻辑有对应测试。
- 没有新增未解释的 lint、type 或 runtime warning。

### 1.3 提交前检查

准备提交前执行：

```text
gitnexus_detect_changes({ repo: "windhoox", scope: "all" })
```

要求：

- 变更符号与本实施步骤一致。
- 受影响流程符合预期。
- 如出现意外流程，先补充分析或修复。

---

## 2. Step 1：基线确认与测试夹具准备

### 目标

在不改变生产行为的前提下，为 Claude 迁移建立测试基线和 fixture。

### 改动范围

新增：

```text
test-fixtures/claude/
  valid-final-result.json
  invalid-final-result.json
  final-message-with-code-fence.md
  final-message-with-extra-text.md
```

可选新增：

```text
src/main/claude/runtime/
src/main/schemas/
```

此步骤不修改现有函数行为。

### 具体任务

1. 运行当前完整测试，确认迁移前基线。
2. 新增合法 Claude 最终 JSON fixture。
3. 新增非法 JSON fixture。
4. 新增带 Markdown `json` code fence 的 final message fixture。
5. 新增前后带说明文字的 final message fixture。
6. 确认 fixture 覆盖架构文档中的 `WindhooxAgentResult` 字段。

### 验收标准

- fixture JSON 可被 `JSON.parse` 解析，非法 fixture 除外。
- fixture 字段覆盖 `pageUnderstanding`、`insights`、`questions`、`cases`、`coverage`、`validation`。
- 当前 DeepSeek 链路测试仍全部通过。

### 完整测试门禁

```bash
pnpm test
pnpm typecheck
pnpm build
```

成功后进入 Step 2。

---

## 3. Step 2：业务 Schema 与结果提取器

### 目标

先完成与 Claude SDK 无关的纯业务解析能力：从 final message 中提取 JSON，并校验为 `WindhooxAgentResult`。

### 改动范围

新增：

```text
src/main/schemas/windhooxAgentResult.ts
src/main/schemas/windhooxAgentResult.test.ts
src/main/claude/runtime/ClaudeResultExtractor.ts
src/main/claude/runtime/ClaudeResultExtractor.test.ts
```

修改：

```text
package.json
pnpm-lock.yaml
```

如需修改类型：

```text
src/types/agent.ts
```

### GitNexus 要求

如果修改 `src/types/agent.ts` 中已有接口，先对相关使用点做影响分析。

建议检查：

```text
gitnexus_context({ name: "AgentEvent", repo: "windhoox" })
```

### 具体任务

1. 安装 `zod`，用于本地业务 schema 校验。
2. 添加 `windhooxAgentResultSchema`。
3. 导出 `WindhooxAgentResult` 类型。
4. 实现 `ClaudeResultExtractor.extract(message: string)`。
5. 支持优先提取 Markdown `json` code fence。
6. 支持提取纯 JSON object。
7. 支持从前后有说明文字的内容中提取首个完整 JSON object。
8. 对 `JSON.parse` 失败返回结构化错误。
9. 对 schema 校验失败返回结构化错误。
10. 暂不接入 repair prompt，只预留错误类型和调用入口。

### 必测用例

- 合法完整 JSON 通过。
- Markdown code fence JSON 通过。
- 前后带说明文字通过。
- 坏 JSON 返回 parse error。
- 缺少 `pageUnderstanding` 返回 validation error。
- `confidence` 枚举错误返回 validation error。
- 空数组合法通过。

### 验收标准

- 结果提取器不依赖 Electron。
- 结果提取器不依赖 Claude SDK。
- schema 文件不依赖 UI 类型。
- 错误信息足够定位是 parse 失败还是 schema 失败。

### 完整测试门禁

```bash
pnpm test
pnpm typecheck
pnpm build
```

成功后进入 Step 3。

---

## 4. Step 3：事件适配器

### 目标

把 `WindhooxAgentResult` 稳定转换为现有 UI 兼容的 `AgentEvent[]`。

### 改动范围

新增：

```text
src/main/claude/runtime/ClaudeEventAdapter.ts
src/main/claude/runtime/ClaudeEventAdapter.test.ts
```

可能修改：

```text
src/types/agent.ts
```

### GitNexus 要求

修改 `AgentEvent`、`CaseCandidatesEvent` 或 `AgentRunCompletedEvent` 前，先执行 impact analysis。

### 具体任务

1. 实现 `createRunStartedEvent`。
2. 实现 `createReadingSourceEvents`。
3. 实现 `resultToAgentEvents`。
4. 保持现有事件类型不变：
   - `run_started`
   - `reading_sources`
   - `requirement_insight`
   - `missing_questions`
   - `case_candidates`
   - `coverage_matrix`
   - `run_completed`
   - `run_failed`
5. 为缺失 question id 自动生成 `q-*`。
6. 为缺失 case id 自动生成 `TC-*`。
7. case 初始状态固定为 `pending`。
8. 不在适配器里写文件、读配置或访问 Claude SDK。

### 必测用例

- 每个 insight 生成一个 `requirement_insight`。
- questions 生成一个 `missing_questions`。
- cases 生成一个 `case_candidates`。
- coverage 生成一个 `coverage_matrix`。
- 所有事件使用同一个 `sessionId`。
- 缺失 id 时自动补齐。
- 空数组时不生成对应业务事件。

### 验收标准

- Renderer 现有事件消费代码不需要改动。
- 适配器是纯函数或接近纯函数。
- timestamp 可注入或可预测，便于测试。

### 完整测试门禁

```bash
pnpm test
pnpm typecheck
pnpm build
```

成功后进入 Step 4。

---

## 5. Step 4：Claude 配置迁移

### 目标

把应用配置从 DeepSeek 字段迁移到 Claude 字段，但此步骤暂不切换分析链路。

### 改动范围

修改：

```text
src/types/agent.ts
src/main/config.ts
src/main/config.test.ts
```

可能修改：

```text
src/renderer/features/workbench/AIConfigModal.tsx
src/renderer/features/workbench/*.test.tsx
```

### GitNexus impact

修改前至少执行：

```text
gitnexus_impact({ target: "getConfig", direction: "upstream", repo: "windhoox" })
gitnexus_impact({ target: "setConfig", direction: "upstream", repo: "windhoox" })
gitnexus_impact({ target: "getConfigMasked", direction: "upstream", repo: "windhoox" })
gitnexus_impact({ target: "isConfigReady", direction: "upstream", repo: "windhoox" })
```

### 具体任务

1. 将 `AppConfig` 改为：

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

2. 默认配置改为：

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

3. `.env.local` 支持：

```text
ANTHROPIC_API_KEY=
CLAUDE_MODEL=
```

4. 读取旧磁盘配置时忽略 `deepseek*` 字段。
5. 保存配置时只写 Claude 字段。
6. `getConfigMasked` mask `anthropicApiKey`。
7. `isConfigReady` 只检查 `anthropicApiKey`。
8. UI 表单改为 Claude 配置项。

### 必测用例

- 默认配置正确。
- `.env.local` 能覆盖 `ANTHROPIC_API_KEY`。
- `.env.local` 能覆盖 `CLAUDE_MODEL`。
- 旧 DeepSeek config 文件不会污染新配置。
- `setConfig` 不写回 `deepseek*`。
- masked config 不泄露完整 key。
- 未配置 API key 时 `isConfigReady` 为 false。

### 验收标准

- UI 不再出现 DeepSeek 字样。
- 类型层不再暴露 `deepseekApiKey`、`deepseekBaseUrl`、`deepseekModel`。
- 此步骤结束时，即使分析链路还未切换，配置测试必须全部通过。

### 完整测试门禁

```bash
pnpm test
pnpm test:renderer
pnpm test:electron
pnpm typecheck
pnpm build
```

成功后进入 Step 5。

---

## 6. Step 5：Claude Runtime 骨架

### 目标

建立 Claude SDK 隔离层和 runtime 抽象，先使用 mockable adapter 保持测试可控。

### 改动范围

新增：

```text
src/main/claude/runtime/ClaudeRuntimeTypes.ts
src/main/claude/runtime/createClaudeOptions.ts
src/main/claude/runtime/createClaudeRuntime.ts
src/main/claude/runtime/runClaudeAnalysis.ts
src/main/claude/runtime/runClaudeAnalysis.test.ts
```

修改：

```text
package.json
pnpm-lock.yaml
```

### GitNexus impact

新增文件不需要 impact。若为了兼容修改 `runLocalAgent`，先执行：

```text
gitnexus_impact({ target: "runLocalAgent", direction: "upstream", repo: "windhoox" })
```

### 具体任务

1. 安装 Claude Agent SDK 依赖。
2. 定义 `AgentRuntime` 接口。
3. 定义 `ClaudeAnalysisInput`、`ClaudeAnalysisCallbacks`、`ClaudeRunResult`。
4. 实现 `createClaudeOptions`，只负责 options 组装。
5. MVP allowed tools 固定默认：

```text
Read
Glob
Grep
WebFetch
```

6. 禁用：

```text
Write
Edit
Bash
Agent
MCP
```

7. `runClaudeAnalysis` 编排：
   - 发出 `run_started`。
   - 发出 `reading_sources`。
   - 调用 Claude SDK query。
   - 收集 final message。
   - 调用 `ClaudeResultExtractor`。
   - 调用 `ClaudeEventAdapter`。
   - 暂时返回内存 artifact paths 占位。
8. 所有 SDK 调用通过可替换的 query adapter 注入，单元测试不打真实网络。

### 必测用例

- options 包含模型、API key、cwd、allowed tools。
- options 不包含禁用工具。
- runtime 成功时回调事件顺序正确。
- runtime 收到非法 JSON 时回调 `run_failed`。
- SDK 抛错时回调 `run_failed`。
- 未配置 key 时返回可恢复失败。

### 验收标准

- Claude SDK 类型不泄漏到 renderer、preload 和 schema。
- 单元测试使用 fake query adapter。
- `runClaudeAnalysis` 不直接写文件。
- `createClaudeOptions` 不解析 JSON、不发 IPC、不写 artifact。

### 完整测试门禁

```bash
pnpm test
pnpm typecheck
pnpm build
```

如依赖安装或构建涉及网络，必须记录依赖版本。

成功后进入 Step 6。

---

## 7. Step 6：IPC 分析链路切换

### 目标

让 `agent:start-analysis` 从 DeepSeek 链路切换到 Claude runtime，同时保持 renderer 事件协议不变。

### 改动范围

修改：

```text
src/main/agent-handlers.ts
src/main/agent-runner.ts
src/main/agent-runner.test.ts
```

可能新增：

```text
src/main/claude/runtime/createProductionClaudeRuntime.ts
```

### GitNexus impact

修改前执行：

```text
gitnexus_impact({ target: "registerAgentHandlers", direction: "upstream", repo: "windhoox" })
gitnexus_impact({ target: "runLocalAgent", direction: "upstream", repo: "windhoox" })
```

### 具体任务

1. 将 `agent-handlers.ts` 作为 IPC 边界保留。
2. `agent-handlers.ts` 依赖 `AgentRuntime` 抽象。
3. `agent:start-analysis` 创建 Windhoox `sessionId`。
4. 调用 `runtime.runAnalysis(input, callbacks)`。
5. 每个 callback event 实时发送给 renderer。
6. `continue-analysis` MVP 返回明确未支持状态，不再静默 `{ success: true }`。
7. `review-case` MVP 保持业务状态返回，但必须发出或返回明确结果。
8. `load-session` 在 Step 7 前可返回明确未支持状态。
9. `agent-runner.ts` 可临时作为 facade 调用 `runClaudeAnalysis`，但不得再调用 DeepSeek。

### 必测用例

- `agent:start-analysis` 立即返回 `sessionId`。
- runtime callback 的事件会发送到 `agent:event`。
- runtime 失败时发送 `run_failed`。
- `continue-analysis` 返回 not supported。
- `load-session` 返回 not supported。
- handler 不直接 import Claude SDK query。

### 验收标准

- Renderer 不需要改 `startAnalysis` 调用方式。
- `agent-handlers.ts` 不解析 Claude final JSON。
- `agent-handlers.ts` 不写 artifact。
- DeepSeek client 不再处于运行链路。

### 完整测试门禁

```bash
pnpm test
pnpm test:electron
pnpm typecheck
pnpm build
```

涉及 UI 事件时额外执行：

```bash
npx playwright test e2e/verify-analysis-flow.spec.ts
```

成功后进入 Step 7。

---

## 8. Step 7：Artifact 与 Session 最小持久化

### 目标

把分析输入、事件、最终结果和 artifact 真实写入 userData，并实现基础 session 回放。

### 改动范围

新增：

```text
src/main/storage/ArtifactWriter.ts
src/main/storage/ArtifactWriter.test.ts
src/main/storage/SessionStore.ts
src/main/storage/SessionStore.test.ts
src/main/storage/SessionTypes.ts
```

修改：

```text
src/main/claude/runtime/runClaudeAnalysis.ts
src/main/agent-handlers.ts
src/types/agent.ts
```

### GitNexus impact

修改 runtime 和 handler 前执行：

```text
gitnexus_impact({ target: "runClaudeAnalysis", direction: "upstream", repo: "windhoox" })
gitnexus_impact({ target: "registerAgentHandlers", direction: "upstream", repo: "windhoox" })
```

### 具体任务

1. `ArtifactWriter` 写入：

```text
{userData}/windhoox/sessions/{sessionId}/input.json
{userData}/windhoox/sessions/{sessionId}/events.json
{userData}/windhoox/sessions/{sessionId}/final-result.json
{userData}/windhoox/sessions/{sessionId}/cases.json
{userData}/windhoox/sessions/{sessionId}/coverage.json
{userData}/windhoox/sessions/{sessionId}/validation.json
{userData}/windhoox/sessions/{sessionId}/trace.json
{userData}/windhoox/sessions/{sessionId}/final-output.md
{userData}/windhoox/sessions/{sessionId}/session-metadata.json
```

2. `run_completed.artifactPaths` 返回真实路径。
3. `SessionStore.loadSession(sessionId)` 读取 `events.json`。
4. `agent:load-session` 调用 `SessionStore` 并返回事件列表。
5. 写入失败时发送 `run_failed`。
6. 移除所有 `/tmp/{sessionId}` 假路径。

### 必测用例

- 成功分析后所有核心文件存在。
- 文件内容为合法 JSON 或 Markdown。
- `events.json` 可回放。
- `loadSession` 返回事件列表。
- 不存在的 session 返回明确错误。
- artifact path 不包含 `/tmp`。

### 验收标准

- storage 模块不依赖 Claude SDK。
- artifact 写入路径只在 userData 下。
- `loadSession` 不触发 Claude SDK。
- 重启应用后仍可读取已写 session。

### 完整测试门禁

```bash
pnpm test
pnpm test:electron
pnpm typecheck
pnpm build
npx playwright test e2e/verify-analysis-flow.spec.ts
```

成功后进入 Step 8。

---

## 9. Step 8：Renderer 配置与错误态适配

### 目标

让前端完整适配 Claude 配置、未支持功能提示和 artifact/session 状态。

### 改动范围

修改：

```text
src/renderer/features/workbench/AIConfigModal.tsx
src/renderer/features/workbench/WorkbenchPage.tsx
src/renderer/features/workbench/AgentConversationPanel.tsx
src/renderer/features/agent/agentState.ts
src/renderer/features/**/*.test.tsx
```

### GitNexus impact

修改 renderer 函数或状态 reducer 前，先对相关 symbol 执行 impact analysis。

建议检查：

```text
gitnexus_context({ name: "agentState", repo: "windhoox" })
```

### 具体任务

1. 设置弹窗改为：
   - Anthropic API Key
   - Claude 模型
   - Workspace settings 开关
   - Allowed tools 展示或受控开关
2. 删除 DeepSeek 文案。
3. `continueAnalysis` 未支持时展示明确状态。
4. `loadSession` 成功时回放事件。
5. `run_failed` 错误信息展示为可理解文案。
6. artifact path 如需展示，不暴露不必要的系统路径细节。

### 必测用例

- 配置弹窗加载 Claude 配置。
- 保存配置调用 `setConfig` 新字段。
- masked API key 不被当作真实 key 回写。
- `run_failed` 不导致状态机异常。
- `loadSession` 事件回放后 UI 状态正确。

### 验收标准

- UI 不再出现 DeepSeek 字样。
- 用户能完成 Claude 配置保存。
- 未支持能力有清晰反馈。
- 现有 workbench 主流程不回退。

### 完整测试门禁

```bash
pnpm test
pnpm test:renderer
pnpm typecheck
pnpm build
npx playwright test e2e/verify-analysis-flow.spec.ts
```

成功后进入 Step 9。

---

## 10. Step 9：移除 DeepSeek legacy

### 目标

完全删除 DeepSeek 调用链，确保生产代码和测试都不再依赖 legacy provider。

### 改动范围

删除：

```text
src/main/deepseek-client.ts
src/main/deepseek-client.test.ts
```

修改：

```text
src/main/agent-runner.ts
src/main/agent-runner.test.ts
src/main/config.ts
src/main/config.test.ts
src/types/agent.ts
src/renderer/**/*.tsx
src/renderer/**/*.test.tsx
```

### GitNexus impact

删除或修改前执行：

```text
gitnexus_impact({ target: "chatCompletion", direction: "upstream", repo: "windhoox" })
gitnexus_impact({ target: "buildAnalysisPrompt", direction: "upstream", repo: "windhoox" })
gitnexus_impact({ target: "DeepSeekError", direction: "upstream", repo: "windhoox" })
```

### 具体任务

1. 删除 DeepSeek client 文件和测试。
2. 删除所有 DeepSeek import。
3. 删除 `deepseek*` 类型字段。
4. 删除 `.env.local` DeepSeek 新写入支持。
5. 搜索确认无 DeepSeek 残留：

```bash
rg -n "DeepSeek|deepseek|DEEPSEEK" .
```

允许残留：

- 迁移文档中描述历史状态的内容。
- changelog 或架构文档中的历史说明。

### 必测用例

- `rg` 结果只剩文档历史说明。
- 所有 runtime 测试走 Claude fake adapter。
- 配置测试只覆盖 Claude。
- 生产构建不引用 `deepseek-client`。

### 验收标准

- DeepSeek 不在依赖链路中。
- `pnpm build` 后 dist 中无 DeepSeek runtime import。
- 用户配置不会再写 DeepSeek 字段。

### 完整测试门禁

```bash
pnpm test
pnpm test:renderer
pnpm test:electron
pnpm typecheck
pnpm build
npx playwright test e2e/verify-analysis-flow.spec.ts
```

成功后进入 Step 10。

---

## 11. Step 10：打包资源与预留目录

### 目标

完成 Claude resources 的目录、打包配置和首次启动路径预留，为 Phase 2 Skills 和 Phase 3 Subagents 做准备。

### 改动范围

新增：

```text
resources/claude/
  agents/.gitkeep
  skills/.gitkeep
```

可能新增：

```text
src/main/claude/config/ClaudeSettingsWriter.ts
src/main/claude/config/ClaudeSettingsWriter.test.ts
```

修改：

```text
electron-builder.yml
```

### 具体任务

1. 新建 `resources/claude/agents`。
2. 新建 `resources/claude/skills`。
3. 配置 `electron-builder.yml`：

```yaml
extraResources:
  - from: resources/claude
    to: claude
```

4. 如实现路径工具，支持开发环境和生产环境：
   - 开发：`{projectRoot}/resources/claude`
   - 生产：`process.resourcesPath/claude`
5. 暂不启用 Skills 或 Subagents。

### 必测用例

- 开发环境资源路径可解析。
- 生产环境路径函数可 mock 验证。
- builder 配置语法正确。

### 验收标准

- 打包配置不影响现有构建。
- resources 目录可被纳入安装包。
- Skills/Subagents 仍处于禁用状态。

### 完整测试门禁

```bash
pnpm test
pnpm typecheck
pnpm build
```

如需要验证安装包：

```bash
pnpm dist:mac
```

成功后进入 Step 11。

---

## 12. Step 11：发布级总验收

### 目标

确认 Claude Agent SDK First MVP 可以作为完整替代 DeepSeek 的版本交付。

### 自动化验收

必须执行：

```bash
pnpm test
pnpm test:renderer
pnpm test:electron
pnpm typecheck
pnpm build
npx playwright test e2e/verify-analysis-flow.spec.ts
```

### 代码搜索验收

执行：

```bash
rg -n "DeepSeek|deepseek|DEEPSEEK" src package.json vite.config.ts tsconfig.json electron-builder.yml
rg -n "/tmp/\\$\\{|/tmp/|conversationPath" src/main src/types src/renderer
rg -n "Bash|Write|Edit|Agent|MCP" src/main/claude src/main/config.ts
```

要求：

- 源码中无 DeepSeek runtime 残留。
- artifact 不再使用 `/tmp` 假路径。
- 默认禁用危险工具。

### 手动冒烟验收

执行：

```bash
pnpm dev
```

检查：

1. 应用启动成功。
2. 设置页显示 Claude 配置。
3. 保存 Anthropic API Key 和 Claude 模型成功。
4. 输入简单需求并开始分析。
5. UI 显示运行中状态。
6. 成功时展示 insights、questions、cases、coverage。
7. 成功时生成真实 artifact 文件。
8. 断网或错误 key 时展示 `run_failed`。
9. 重启应用后能 `loadSession` 回放。

### GitNexus 验收

提交前执行：

```text
gitnexus_detect_changes({ repo: "windhoox", scope: "all" })
```

确认：

- 变更集中在 Claude runtime、config、storage、IPC、renderer 配置和测试。
- 没有意外影响更新器、preload 以外的系统能力。
- 如出现意外流程，先补文档说明或修复。

### 发布判定

满足以下条件才可标记 Claude SDK MVP 完成：

- DeepSeek 调用链完全移除。
- Claude runtime 可 mock 测试且可真实冒烟。
- `AgentEvent` 兼容当前 UI。
- Artifact 真实落盘。
- `loadSession` 可回放。
- 默认安全策略禁用危险工具。
- 所有测试门禁通过。

---

## 13. 风险与处理策略

| 风险 | 触发点 | 处理 |
|---|---|---|
| Claude SDK 在 Electron Main 中运行异常 | Step 5 / Step 6 | 先用 adapter 隔离 SDK，再做最小真实冒烟 |
| JSON 输出不稳定 | Step 2 / Step 5 | 强 schema、fixture、一次 repair 预留 |
| UI 事件协议破坏 | Step 3 / Step 6 / Step 8 | 事件适配器单测和 renderer 回归测试 |
| 配置迁移导致用户无法运行 | Step 4 | 旧 DeepSeek 字段忽略，不自动迁移 key |
| artifact 路径泄露或不可写 | Step 7 | 只写 userData，路径生成集中测试 |
| dangerous tools 被误启用 | Step 5 / Step 11 | 默认 allowed tools 白名单和搜索验收 |
| 一步改动过大 | 全阶段 | 失败时停在当前步骤，不进入下一步 |

---

## 14. 后续阶段边界

本文覆盖 Claude SDK MVP 及替换 DeepSeek 的主链路。

以下能力不进入 MVP，必须在 MVP 完成后另开实施文档：

- Phase 2：Claude Skills 安装、启用、禁用和 UI 管理。
- Phase 3：Subagents 安装、启用、禁用和 trace 展示。
- Phase 4：Claude session resume 与多轮继续分析。
- Phase 5：完整 hooks、权限审计和高级安全模式。

MVP 中可以预留目录和接口，但不得提前实现复杂路由或自研 Agent 能力。
