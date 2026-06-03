<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **windhoox** (944 symbols, 1292 relationships, 23 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> If any GitNexus tool warns the index is stale, run `npx gitnexus analyze` in terminal first.

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `gitnexus_impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `gitnexus_detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `gitnexus_query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `gitnexus_context({name: "symbolName"})`.

## Core Execution Flows 维护规则

核心流程文档位于 `docs/core-execution-flows.md`，评判规则见 `scripts/update-core-flows.mjs`。

### 评分公式

```
coreScore = 出度(OD) × 1 + 最长Process步骤(MS) × 2 + 跨社区数(CC) × 3
```

- **P0 核心流程**: coreScore ≥ 15
- **P1 支撑流程**: coreScore 8–14
- **P2 工具流程**: coreScore < 8

### 触发更新的时机

当以下任一条件满足时，运行 `npx gitnexus analyze && node scripts/update-core-flows.mjs` 刷新文档：

1. **新增 IPC handler** — 添加了新的 `ipcMain.handle("agent:*")` 通道
2. **新增高 OD 函数** — 通过 `gitnexus_cypher` 查询发现出度 ≥ 3 的新编排函数
3. **新增 Process** — `gitnexus://repo/windhoox/processes` 出现新的跨社区流程
4. **结构性重构** — 合并到 main 前运行一次

### 手动维护的部分

`scripts/update-core-flows.mjs` 中 `FLOWS` 数组的流程**描述**和**执行链**需人工维护。自动计算的只有 `coreScore` 分数和等级分类。新增流程需手动添加到 `FLOWS` 和 `STATIC_SCORES`。

## Never Do

- NEVER edit a function, class, or method without first running `gitnexus_impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `gitnexus_rename` which understands the call graph.
- NEVER commit changes without running `gitnexus_detect_changes()` to check affected scope.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/windhoox/context` | Codebase overview, check index freshness |
| `gitnexus://repo/windhoox/clusters` | All functional areas |
| `gitnexus://repo/windhoox/processes` | All execution flows |
| `gitnexus://repo/windhoox/process/{name}` | Step-by-step execution trace |
| `docs/core-execution-flows.md` | 核心流程排行与评判规则 |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |
| 刷新核心流程文档 | `npx gitnexus analyze && node scripts/update-core-flows.mjs` |

<!-- gitnexus:end -->
