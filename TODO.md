# Windhoox TODO - 后续工作计划

**最后更新**: 2026-06-03  
**当前状态**: MVP (Steps 1-11) 已完成

---

## 立即待办 (Immediate)

### E2E 测试修复
- [ ] **修复 Sender 组件 Enter 键提交问题**
  - 当前问题: 测试中按 Enter 后 "分析中..." 加载状态不出现
  - 可能原因:
    - Sender 组件可能需要 Ctrl+Enter 或点击发送按钮
    - 需要检查 `@ant-design/x` Sender 的实际提交行为
    - 可能需要等待更长时间或检查不同的加载指示器
  - 影响: E2E 测试 2 和 3 失败
  - 优先级: 高

### 真实 API 冒烟测试
- [ ] **验证 DeepSeek 兼容模式端到端流程**
  - 配置 `.env.local` 中的 DeepSeek API Key
  - 启动应用 (`pnpm dev`)
  - 点击 "Demo 演示" 触发分析
  - 验证完整流程:
    - ✅ 配置保存
    - ✅ `run_started` 事件
    - ⏳ `run_completed` 事件（需要真实 API 调用）
    - ⏳ Artifact 文件生成
    - ⏳ UI 正确显示结果
  - 优先级: 高

---

## Phase 2: Claude Skills 管理

**前置条件**:
- [x] MVP 完成并稳定运行
- [x] `resources/claude/skills/` 目录已预留

### 核心功能
- [ ] 定义 Skills manifest schema (skill.json 或 skill.yaml)
- [ ] 实现 Skills 加载器: 扫描 `resources/claude/skills/` 目录
- [ ] 实现 Skills 启用/禁用状态管理 (持久化到 userData)
- [ ] 修改 ClaudeRuntime 支持动态注入 Skills 到 system prompt 或 allowed tools
- [ ] 新增 Renderer 组件: Skills 管理面板 (列表、开关、详情)

### 扩展功能
- [ ] 实现 Skills 安装接口 (从本地路径或远程 URL 安装)
- [ ] 添加 Skills 冲突检测和依赖解析
- [ ] 编写 Skills 使用示例和开发指南

### 测试与验收
- [ ] 单元测试覆盖 Skills 加载、启用、冲突检测
- [ ] E2E 测试覆盖 Skills 安装、启用、生效流程

**验收标准**:
- 用户可通过 UI 安装、启用、禁用 Skills
- 启用的 Skills 在分析运行时自动注入
- Skills 状态持久化，重启后保持
- 冲突 Skills 有明确提示

---

## Phase 3: Subagents 支持

**前置条件**:
- [x] MVP 完成并稳定运行
- [x] `resources/claude/agents/` 目录已预留
- [ ] Phase 2 Skills 基础架构已完成 (可选)

### 核心功能
- [ ] 定义 Subagents manifest schema (agent.json)
- [ ] 实现 Subagents 加载器: 扫描 `resources/claude/agents/` 目录
- [ ] 实现 Subagents 启用/禁用状态管理
- [ ] 修改 ClaudeRuntime 支持 Claude SDK 的 agent spawning API
- [ ] 新增 AgentEvent 类型: `subagent_started`、`subagent_progress`、`subagent_completed`

### UI 与交互
- [ ] 实现 Subagent trace 展示组件 (时间线、状态、输出)
- [ ] 修改 AgentConversationPanel 支持嵌套展示 Subagent 对话
- [ ] 实现 Subagent 权限控制 (限制可使用的工具)
- [ ] 添加 Subagent 资源配额 (token 限制、超时)

### 测试与验收
- [ ] 单元测试覆盖 Subagent 生命周期事件
- [ ] E2E 测试覆盖 Subagent 启动、执行、结果回传

**验收标准**:
- 用户可通过 UI 启用/禁用 Subagents
- Subagent 执行时在 UI 显示进度和 trace
- Subagent 结果正确合并到主分析流程
- Subagent 错误不导致主流程崩溃

---

## Phase 4: Session Resume 与多轮对话

**前置条件**:
- [x] MVP 完成并稳定运行
- [x] `SessionStore.loadSession()` 已实现
- [ ] `agent:continue-analysis` 当前返回 "not supported" (需实现)

### 核心功能
- [ ] 扩展 `AgentRunContinuedEvent` 事件类型
- [ ] 实现 ClaudeRuntime.continueConversation() 的完整逻辑
- [ ] 修改 `agent:continue-analysis` 支持传入 previousSessionId 和用户反馈
- [ ] 实现上下文裁剪: 从 previousSessionId 加载历史事件，构建精简 prompt
- [ ] 支持用户选择性接受/拒绝上一轮 cases 和 questions

### UI 与交互
- [ ] 新增 Renderer 组件: 继续分析入口 (从历史记录或失败状态)
- [ ] 修改 AgentConversationPanel 支持多轮对话气泡展示
- [ ] 实现 session chain 可视化 (多轮关系图)
- [ ] 添加 continue-analysis 的 token 预算控制

### 测试与验收
- [ ] 单元测试覆盖 continue-analysis 事件流
- [ ] E2E 测试覆盖多轮对话完整流程

**验收标准**:
- 用户可从历史记录中选择 session 并继续分析
- 继续分析时显示前一轮摘要和反馈选项
- 多轮对话在 UI 中清晰区分轮次
- Token 使用量不超过预算

---

## Phase 5: Hooks、权限审计与高级安全

**前置条件**:
- [x] MVP 完成并稳定运行
- [ ] Phase 2-4 基础功能已实现

### Hooks 系统
- [ ] 定义 Hooks 配置 schema (pre-hook、post-hook、on-error)
- [ ] 实现 Hook 执行器 (shell 命令或 HTTP webhook)
- [ ] 添加 Hook 管理 UI (配置、启用、查看日志)

### 权限与审计
- [ ] 实现权限审计日志 (记录所有 tool 调用、文件读写)
- [ ] 新增审计日志查看器组件 (搜索、过滤、导出)

### 高级安全模式
- [ ] 工具调用确认弹窗 (Write/Edit/Bash 前需用户批准)
- [ ] 网络请求白名单 (限制 Claude 可访问的域名)
- [ ] 文件访问沙箱 (限制可读/可写目录)
- [ ] 实现敏感信息检测 (API key、password 在输出中自动 mask)

### 测试与验收
- [ ] 添加安全检查到 CI 流程 (扫描配置中的危险工具)
- [ ] 单元测试覆盖 Hook 执行、权限检查、审计记录
- [ ] E2E 测试覆盖安全模式下的完整分析流程

**验收标准**:
- 用户可配置和执行 pre/post hooks
- 所有 tool 调用有完整审计日志
- 高级安全模式下，危险操作需用户确认
- 敏感信息不在 UI 或日志中明文展示
- CI 检查可阻止危险配置合入

---

## 通用 TODO (跨 Phase)

### 文档与示例
- [ ] 编写 Skills 开发指南 (如何创建、测试、发布 Skill)
- [ ] 编写 Subagents 开发指南 (如何定义、调试 Agent)
- [ ] 添加架构决策记录 (ADR) 说明每个 Phase 的设计选择
- [ ] 录制演示视频 (Skills 安装、Subagent 执行、多轮对话)

### 测试与质量
- [ ] 建立性能基准 (分析耗时、token 使用、内存占用)
- [ ] 添加压力测试 (并发分析、大量 cases 生成)
- [ ] 实现遥测收集 (匿名使用统计、错误率)
- [ ] 定期安全审计 (依赖扫描、代码审查)

### 发布与运维
- [ ] 制定 Skills/Subagents 发布流程 (版本管理、兼容性矩阵)
- [ ] 建立用户反馈渠道 (GitHub Issues、Discord)
- [ ] 编写升级指南 (从 DeepSeek 迁移到 Claude SDK)
- [ ] 准备 FAQ 文档 (常见问题、troubleshooting)

---

## 已知问题与限制

### 技术问题
1. **E2E 测试 Sender 提交行为** (高优先级)
   - 文件: `e2e/verify-analysis-flow.spec.ts`
   - 问题: 测试 2 和 3 失败，Enter 键不触发提交
   - 需要: 调查 `@ant-design/x` Sender 组件的实际提交机制

2. **Chunk Size Warning**
   - 构建时警告某些 chunk 超过 500KB
   - 建议: 使用 dynamic import() 进行代码分割
   - 优先级: 低 (不影响功能)

### 设计限制 (MVP 范围)
1. **`agent:continue-analysis` 未实现**
   - 当前返回 "not supported"
   - 将在 Phase 4 实现

2. **Skills/Subagents 禁用**
   - 目录已预留，功能未实现
   - 将在 Phase 2-3 实现

3. **Hook 系统未实现**
   - 无 pre/post hook 支持
   - 将在 Phase 5 实现

---

## 阶段依赖关系

```
MVP (Steps 1-11) ✅ [已完成]
  ↓
Phase 2: Skills
  ↓
Phase 3: Subagents (可选依赖 Phase 2)
  ↓
Phase 4: Session Resume
  ↓
Phase 5: Hooks & Security

并行: 通用 TODO (文档、测试、发布) 可在任意阶段进行
```

---

## 快速启动指南

### 开发环境
```bash
# 安装依赖
pnpm install

# 配置 API (DeepSeek 兼容模式)
# 编辑 .env.local:
# CLAUDE_API_KEY=YOUR_DEEPSEEK_API_KEY
# CLAUDE_BASE_URL=https://api.deepseek.com/anthropic
# CLAUDE_MODEL=deepseek-chat

# 启动开发服务器
pnpm dev
```

### 运行测试
```bash
# 单元测试
pnpm test

# 类型检查
pnpm typecheck

# 构建
pnpm build

# E2E 测试 (需要先启动 dev server)
npx playwright test e2e/verify-analysis-flow.spec.ts
```

### 验证 API 集成
1. 启动应用: `pnpm dev`
2. 打开 AI 配置弹窗
3. 确认 Base URL 显示 `https://api.deepseek.com/anthropic`
4. 输入 DeepSeek API Key
5. 保存配置
6. 点击 "Demo 演示"
7. 观察分析流程和结果

---

**提示**: 每个 Phase 建议独立开实施文档，复用 `docs/claude-agent-sdk-first-implementation-plan.md` 的"统一执行规范"(第 1 节) 和"测试门禁"模式。
