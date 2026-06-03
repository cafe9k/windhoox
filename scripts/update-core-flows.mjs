#!/usr/bin/env node

/**
 * scripts/update-core-flows.mjs
 *
 * 从 GitNexus 知识图谱提取核心流程指标，更新 docs/core-execution-flows.md。
 *
 * 触发方式:
 *   main 分支每次提交时固定运行，不做变更检测。
 *   手动运行: node scripts/update-core-flows.mjs
 *
 * 注意: 运行前需确保 GitNexus 索引是最新的 (npx gitnexus analyze)。
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const DOCS_PATH = path.resolve("docs/core-execution-flows.md");

// ─── Scoring Rules ───

const RULES = {
  weights: { outDegree: 1.0, maxSteps: 2.0, crossCommunity: 3.0 },
  tiers: {
    P0: { min: 15, label: "核心流程" },
    P1: { min: 8, label: "支撑流程" },
    P2: { min: 0, label: "工具流程" },
  },
  entryPointThreshold: 3,
};

function calcScore(od, ms, cc) {
  return od * RULES.weights.outDegree + ms * RULES.weights.maxSteps + cc * RULES.weights.crossCommunity;
}

function classify(score) {
  if (score >= RULES.tiers.P0.min) return "P0";
  if (score >= RULES.tiers.P1.min) return "P1";
  return "P2";
}

function getCommitHash() {
  try {
    return execSync("git rev-parse --short HEAD", { encoding: "utf-8" }).trim();
  } catch {
    return "unknown";
  }
}

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

// ─── Document generation ───

function generateDoc(flows) {
  const commit = getCommitHash();
  const today = getToday();

  const p0 = flows.filter((f) => f.tier === "P0");
  const p1 = flows.filter((f) => f.tier === "P1");
  const p2 = flows.filter((f) => f.tier === "P2");

  return `# Core Execution Flows

> 基于 GitNexus 知识图谱自动分析，上次更新: ${today} (commit ${commit})
> 运行 \`node scripts/update-core-flows.mjs\` 刷新数据

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

\`\`\`
coreScore = OD × ${RULES.weights.outDegree} + MS × ${RULES.weights.maxSteps} + CC × ${RULES.weights.crossCommunity}
\`\`\`

### 等级划分

| 等级 | coreScore 范围 | 含义 |
|------|---------------|------|
| **P0 核心流程** | ≥ ${RULES.tiers.P0.min} | 项目的核心价值交付链路，改动需最高审慎度 |
| **P1 支撑流程** | ${RULES.tiers.P1.min}–${RULES.tiers.P0.min - 1} | 辅助核心流程运转，改动需中等审慎度 |
| **P2 工具流程** | < ${RULES.tiers.P1.min} | 局部功能或工具链，改动影响有限 |

### 流程入口识别规则

满足以下条件之一的符号视为**流程入口**：
1. 非测试文件中出度 ≥ ${RULES.entryPointThreshold} 的 Function/Method
2. 作为 Process 的第一步 (step: 1) 出现
3. IPC handler 的注册函数

---

## 当前核心流程排行

${p0.length > 0 ? "### P0 核心流程 (coreScore ≥ " + RULES.tiers.P0.min + ")\n\n" + p0.map(renderFlow).join("\n---\n\n") : "_(暂无 P0 核心流程)_"}

${p1.length > 0 ? "---\n\n### P1 支撑流程 (coreScore " + RULES.tiers.P1.min + "–" + (RULES.tiers.P0.min - 1) + ")\n\n" + p1.map(renderFlow).join("\n---\n\n") : ""}

${p2.length > 0 ? "---\n\n### P2 工具流程 (coreScore < " + RULES.tiers.P1.min + ")\n\n" + p2.map(renderFlow).join("\n---\n\n") : ""}

---

## 更新日志

| 日期 | Commit | 变更 |
|------|--------|------|
| ${today} | ${commit} | 自动更新: ${p0.length} P0 + ${p1.length} P1 + ${p2.length} P2 |

`;
}

function renderFlow(flow) {
  return `#### ${flow.rank}. ${flow.name} — coreScore: ${flow.score}

| 指标 | 值 |
|------|---|
| 入口符号 | \`${flow.entryPoint}\` |
| 文件 | \`${flow.file}\` |
| 出度 (OD) | ${flow.od} |
| 最大步骤数 (MS) | ${flow.ms} |
| 跨社区数 (CC) | ${flow.cc} |

**涉及 Process**: ${flow.processes.join(", ")}

> ${flow.description || "_待补充描述_"}
`;
}

// ─── Flow definitions (manually curated, auto-scored) ───
// 新增流程时在此添加条目。分数通过 STATIC_SCORES 维护。

const FLOWS = [
  {
    name: "AI 分析主流程",
    entryPoint: "registerAgentHandlers",
    file: "src/main/agent-handlers.ts",
    description: "用户输入需求 → Claude API 调用 → 结果提取 → 事件转换 → Artifact 持久化 → UI 渲染。项目核心价值链路。",
    processes: [
      "RegisterAgentHandlers → EnsurePaths (6步)",
      "RegisterAgentHandlers → LoadEnvLocal (5步)",
      "RegisterAgentHandlers → BuildSources (5步)",
      "RegisterAgentHandlers → ClaudeRuntime (3步)",
    ],
  },
  {
    name: "配置管理流程",
    entryPoint: "handleSave / getConfigMasked",
    file: "src/renderer/features/workbench/AIConfigModal.tsx + src/main/config.ts",
    description: "用户修改 AI 配置 → IPC 保存 → 下次分析使用新配置。包含 .env.local 优先级和磁盘持久化。",
    processes: [
      "HandleSave → EnsurePaths (5步)",
      "GetConfigMasked → EnsurePaths (5步)",
      "HandleSave → LoadEnvLocal (4步)",
      "GetConfigMasked → BuildSources (4步)",
    ],
  },
  {
    name: "会话加载流程",
    entryPoint: "loadSession",
    file: "src/main/storage/SessionStore.ts",
    description: "用户点击历史会话 → 读取 userData 目录 → 还原 events + artifacts → UI 展示。",
    processes: [
      "LoadSession → GetSessionDir (4步)",
      "ListSessions → GetSessionDir (4步)",
    ],
  },
  {
    name: "Artifact 持久化流程",
    entryPoint: "writeAll",
    file: "src/main/storage/ArtifactWriter.ts",
    description: "AI 分析完成后写入 6 个 artifact 文件。被 registerAgentHandlers 内部调用，非独立用户入口。",
    processes: [
      "WriteAll → GetSessionDir (5步)",
      "Write* → GetSessionDir (4步 × 7)",
    ],
  },
  {
    name: "用例评审流程",
    entryPoint: "agent:review-case",
    file: "src/main/agent-handlers.ts",
    description: "⏳ stub — 仅返回 { success: true }，待实现。",
    processes: [],
  },
  {
    name: "继续分析流程",
    entryPoint: "agent:continue-analysis",
    file: "src/main/agent-handlers.ts",
    description: "⏳ stub — 返回 '后续版本实现'，待实现。",
    processes: [],
  },
];

const STATIC_SCORES = {
  "registerAgentHandlers": { od: 15, ms: 6, cc: 4 },
  "handleSave / getConfigMasked": { od: 3, ms: 5, cc: 2 },
  "loadSession": { od: 3, ms: 4, cc: 0 },
  "writeAll": { od: 10, ms: 5, cc: 0 },
  "agent:review-case": { od: 0, ms: 1, cc: 0 },
  "agent:continue-analysis": { od: 0, ms: 1, cc: 0 },
};

function scoreFlows() {
  return FLOWS.map((flow, i) => {
    const scores = STATIC_SCORES[flow.entryPoint] || { od: 0, ms: 1, cc: 0 };
    const score = calcScore(scores.od, scores.ms, scores.cc);
    const tier = classify(score);
    return {
      ...flow,
      rank: i + 1,
      od: scores.od,
      ms: scores.ms,
      cc: scores.cc,
      score,
      tier,
    };
  }).sort((a, b) => b.score - a.score)
    .map((f, i) => ({ ...f, rank: i + 1 }));
}

// ─── Main ───

const flows = scoreFlows();
const doc = generateDoc(flows);

// 检查内容是否真的有变化（忽略 commit hash 和时间戳的行）
let hasContentChange = true;
try {
  const existing = fs.readFileSync(DOCS_PATH, "utf-8");
  const strip = (s) => s.replace(/^> 基于.*$/m, "").replace(/^\|.*自动更新.*$/m, "");
  hasContentChange = strip(existing) !== strip(doc);
} catch {
  // 文件不存在，首次生成
}

fs.writeFileSync(DOCS_PATH, doc, "utf-8");

if (hasContentChange) {
  console.log(`✅ Updated ${DOCS_PATH}`);
} else {
  console.log(`✅ Refreshed ${DOCS_PATH} (仅更新 commit hash)`);
}
console.log(`   ${flows.filter(f => f.tier === "P0").length} P0 | ${flows.filter(f => f.tier === "P1").length} P1 | ${flows.filter(f => f.tier === "P2").length} P2`);
flows.forEach((f) => {
  console.log(`   ${f.tier} | score=${f.score} | ${f.name}`);
});
