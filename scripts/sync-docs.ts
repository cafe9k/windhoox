/**
 * Sync docs script — automatically update Chinese translation files
 * when the English source files (managed by GitNexus) change.
 *
 * Usage:
 *   pnpm sync:docs        # Manual run
 *   pnpm gitnexus:sync    # Run after gitnexus analyze
 *
 * This script reads the index stats (symbols, relationships, flows) from
 * CLAUDE.md / AGENTS.md and updates the corresponding lines in
 * CLAUDE.zh.md / AGENTS.zh.md. All other content is preserved.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

interface FilePair {
  source: string;
  target: string;
}

const FILES: FilePair[] = [
  { source: "CLAUDE.md", target: "CLAUDE.zh.md" },
  { source: "AGENTS.md", target: "AGENTS.zh.md" },
];

/**
 * Extract the index stats line from a GitNexus-managed file.
 * Matches: "This project is indexed by GitNexus as **windhoox** (250 symbols, 308 relationships, 4 execution flows)."
 */
function extractStatsLine(content: string): string | null {
  const match = content.match(
    /This project is indexed by GitNexus as \*\*([^*]+)\*\* \((\d+) symbols?,? (\d+) relationships?,? (\d+) execution flows?\)/,
  );
  if (!match) return null;

  const [, name, symbols, relationships, flows] = match;
  return { name, symbols, relationships, flows } as unknown as string;
}

/**
 * Update the stats line in the Chinese translation file.
 */
function updateStatsLine(content: string, name: string, symbols: string, relationships: string, flows: string): string {
  // Match the Chinese stats line pattern
  const chinesePattern =
    /本项目已被 GitNexus 索引为 \*\*([^*]+)\*\*（(\d+) 个符号，(\d+) 条关系，(\d+) 条执行流）。/;

  const newLine = `本项目已被 GitNexus 索引为 **${name}**（${symbols} 个符号，${relationships} 条关系，${flows} 条执行流）。`;

  return content.replace(chinesePattern, newLine);
}

function syncFile(pair: FilePair): void {
  const sourcePath = path.join(ROOT, pair.source);
  const targetPath = path.join(ROOT, pair.target);

  if (!fs.existsSync(sourcePath)) {
    console.error(`❌ Source file not found: ${pair.source}`);
    process.exit(1);
  }

  if (!fs.existsSync(targetPath)) {
    console.error(`❌ Target file not found: ${pair.target}`);
    process.exit(1);
  }

  const sourceContent = fs.readFileSync(sourcePath, "utf-8");
  let targetContent = fs.readFileSync(targetPath, "utf-8");

  const statsMatch = sourceContent.match(
    /This project is indexed by GitNexus as \*\*([^*]+)\*\* \((\d+) symbols?,? (\d+) relationships?,? (\d+) execution flows?\)/,
  );

  if (!statsMatch) {
    console.error(`❌ Could not extract stats from ${pair.source}`);
    process.exit(1);
  }

  const [, name, symbols, relationships, flows] = statsMatch;

  const originalContent = targetContent;
  targetContent = updateStatsLine(targetContent, name, symbols, relationships, flows);

  if (targetContent === originalContent) {
    console.log(`⏭️  ${pair.target} is already up to date`);
    return;
  }

  fs.writeFileSync(targetPath, targetContent, "utf-8");
  console.log(
    `✅ Updated ${pair.target}: ${name} (${symbols} symbols, ${relationships} relationships, ${flows} flows)`,
  );
}

// Main
console.log("🔄 Syncing Chinese translation files...\n");

for (const pair of FILES) {
  syncFile(pair);
}

console.log("\n🎉 Done!");
