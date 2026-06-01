<!-- gitnexus:start -->
# GitNexus — 代码智能

本项目已被 GitNexus 索引为 **windhoox**（371 个符号，504 条关系，14 条执行流）。使用 GitNexus MCP 工具来理解代码、评估影响和安全的导航。

> 如果任何 GitNexus 工具提示索引已过期，先在终端中运行 `npx gitnexus analyze`。

## 必须遵守

- **编辑任何符号之前，必须先执行影响分析。** 在修改函数、类或方法之前，运行 `gitnexus_impact({target: "symbolName", direction: "upstream"})` 并向用户报告影响范围（直接调用者、受影响的执行流、风险等级）。
- **提交前必须运行 `gitnexus_detect_changes()`** 以验证你的修改只影响预期的符号和执行流。
- 如果影响分析返回 **HIGH** 或 **CRITICAL** 风险，**必须警告用户** 后再继续编辑。
- 探索不熟悉的代码时，使用 `gitnexus_query({query: "概念"})` 查找执行流，而不是用 grep。它返回按相关性排序、按执行流分组的结果。
- 当你需要某个符号的完整上下文 — 调用者、被调用者、它参与了哪些执行流 — 使用 `gitnexus_context({name: "symbolName"})`。

## 严禁

- 编辑函数、类或方法之前，**绝不**跳过 `gitnexus_impact`。
- **绝不** 忽略影响分析返回的 HIGH 或 CRITICAL 风险警告。
- **绝不** 使用查找替换来重命名符号 — 使用理解调用图的 `gitnexus_rename`。
- **绝不** 在没有运行 `gitnexus_detect_changes()` 检查影响范围的情况下提交修改。

## 资源

| 资源 | 用途 |
|----------|---------|
| `gitnexus://repo/windhoox/context` | 代码库概览，检查索引新鲜度 |
| `gitnexus://repo/windhoox/clusters` | 所有功能区域 |
| `gitnexus://repo/windhoox/processes` | 所有执行流 |
| `gitnexus://repo/windhoox/process/{name}` | 逐步执行追踪 |

## CLI

| 任务 | 阅读此技能文件 |
|------|---------------------|
| 理解架构 / "X 如何工作？" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| 影响范围 / "修改 X 会破坏什么？" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| 追踪 Bug / "X 为什么失败？" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| 重命名 / 提取 / 拆分 / 重构 | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| 工具、资源、架构参考 | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| 索引、状态、清理、wiki CLI 命令 | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
