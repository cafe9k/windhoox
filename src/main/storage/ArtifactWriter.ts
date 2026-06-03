/**
 * ArtifactWriter - Persists analysis artifacts to the userData directory.
 *
 * Directory structure:
 *   {userData}/windhoox/sessions/{sessionId}/
 *     ├── input.json          - Original requirement input
 *     ├── events.json         - All emitted events
 *     ├── final-result.json   - Extracted WindhooxAgentResult
 *     ├── cases.json          - Generated test cases
 *     ├── coverage.json       - Coverage matrix
 *     ├── validation.json     - Validation results
 *     ├── trace.json          - Claude conversation trace
 *     ├── final-output.md     - Final markdown summary
 *     └── session-metadata.json - Session metadata
 */

import { app } from "electron";
import fs from "node:fs";
import path from "node:path";
import type { AgentEvent } from "../../types/agent.js";
import type { WindhooxAgentResult } from "../schemas/windhooxAgentResult.js";
import type { SessionMetadata, SessionPaths } from "./SessionTypes.js";

export class ArtifactWriter {
  private userDataPath: string;

  constructor(userDataPath?: string) {
    this.userDataPath = userDataPath ?? app.getPath("userData");
  }

  /**
   * Get the session directory path.
   */
  private getSessionDir(sessionId: string): string {
    return path.join(this.userDataPath, "windhoox", "sessions", sessionId);
  }

  /**
   * Ensure session directory exists.
   */
  private ensureSessionDir(sessionId: string): void {
    const dir = this.getSessionDir(sessionId);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * Write a JSON file to the session directory.
   */
  private writeJson(sessionId: string, filename: string, data: unknown): string {
    this.ensureSessionDir(sessionId);
    const filePath = path.join(this.getSessionDir(sessionId), filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
    return filePath;
  }

  /**
   * Write the original requirement input.
   */
  writeInput(sessionId: string, requirementText: string, contextReferences: string[]): string {
    return this.writeJson(sessionId, "input.json", {
      requirementText,
      contextReferences,
      timestamp: Date.now(),
    });
  }

  /**
   * Write all emitted events.
   */
  writeEvents(sessionId: string, events: AgentEvent[]): string {
    return this.writeJson(sessionId, "events.json", events);
  }

  /**
   * Write the extracted final result.
   */
  writeFinalResult(sessionId: string, result: WindhooxAgentResult): string {
    return this.writeJson(sessionId, "final-result.json", result);
  }

  /**
   * Write generated test cases.
   */
  writeCases(sessionId: string, result: WindhooxAgentResult): string {
    return this.writeJson(sessionId, "cases.json", result.cases);
  }

  /**
   * Write coverage matrix.
   */
  writeCoverage(sessionId: string, result: WindhooxAgentResult): string {
    return this.writeJson(sessionId, "coverage.json", result.coverage);
  }

  /**
   * Write validation results.
   */
  writeValidation(sessionId: string, result: WindhooxAgentResult): string {
    return this.writeJson(sessionId, "validation.json", result.validation);
  }

  /**
   * Write Claude conversation trace.
   */
  writeTrace(sessionId: string, trace: unknown): string {
    return this.writeJson(sessionId, "trace.json", trace);
  }

  /**
   * Write final markdown summary.
   */
  writeFinalOutput(sessionId: string, markdown: string): string {
    this.ensureSessionDir(sessionId);
    const filePath = path.join(this.getSessionDir(sessionId), "final-output.md");
    fs.writeFileSync(filePath, markdown, "utf-8");
    return filePath;
  }

  /**
   * Write session metadata.
   */
  writeMetadata(sessionId: string, metadata: SessionMetadata): string {
    return this.writeJson(sessionId, "session-metadata.json", metadata);
  }

  /**
   * Write all artifacts and return their paths.
   */
  writeAll(
    sessionId: string,
    requirementText: string,
    contextReferences: string[],
    events: AgentEvent[],
    result: WindhooxAgentResult,
    trace: unknown,
    metadata: SessionMetadata
  ): SessionPaths {
    const conversationPath = this.writeFinalOutput(
      sessionId,
      this.generateMarkdownSummary(result)
    );
    const insightPath = this.writeFinalResult(sessionId, result);
    const casesPath = this.writeCases(sessionId, result);
    const coveragePath = this.writeCoverage(sessionId, result);
    const validationPath = this.writeValidation(sessionId, result);
    const eventsPath = this.writeEvents(sessionId, events);
    const metadataPath = this.writeMetadata(sessionId, metadata);

    // Write additional artifacts
    this.writeInput(sessionId, requirementText, contextReferences);
    this.writeTrace(sessionId, trace);

    return {
      conversationPath,
      insightPath,
      casesPath,
      coveragePath,
      validationPath,
      eventsPath,
      metadataPath,
    };
  }

  /**
   * Generate a markdown summary from the result.
   */
  private generateMarkdownSummary(result: WindhooxAgentResult): string {
    const lines: string[] = [
      "# Analysis Summary",
      "",
      "## Page Understanding",
      `- **Page Type**: ${result.pageUnderstanding.pageType}`,
      `- **Business Domain**: ${result.pageUnderstanding.businessDomain || "N/A"}`,
      `- **Confidence**: ${result.pageUnderstanding.confidence}`,
      "",
    ];

    if (result.pageUnderstanding.modules.length > 0) {
      lines.push("### Modules");
      for (const module of result.pageUnderstanding.modules) {
        lines.push(`- **${module.name}**: ${module.description || "No description"}`);
      }
      lines.push("");
    }

    if (result.insights.length > 0) {
      lines.push("## Insights");
      for (const insight of result.insights) {
        const details = [
          insight.businessRule ? `Rule: ${insight.businessRule}` : null,
          insight.risk ? `Risk: ${insight.risk}` : null,
          insight.evidence ? `Evidence: ${insight.evidence}` : null,
        ]
          .filter(Boolean)
          .join("; ");
        lines.push(`- **${insight.confidence}**: ${details || "No details"}`);
      }
      lines.push("");
    }

    if (result.questions.length > 0) {
      lines.push("## Questions");
      for (const question of result.questions) {
        lines.push(`- [${question.id}] **${question.category}**: ${question.question}`);
      }
      lines.push("");
    }

    if (result.cases.length > 0) {
      lines.push("## Test Cases");
      lines.push(`Generated ${result.cases.length} test case(s).`);
      lines.push("");
    }

    if (result.coverage.length > 0) {
      lines.push("## Coverage Matrix");
      for (const entry of result.coverage) {
        lines.push(`- **${entry.requirementId}**: ${entry.caseIds.join(", ")}`);
      }
      lines.push("");
    }

    if (result.validation) {
      lines.push("## Validation");
      lines.push(`- **Passed**: ${result.validation.passed}`);
      lines.push(`- **Score**: ${result.validation.score}`);
      if (result.validation.missingCoverage.length > 0) {
        lines.push("### Missing Coverage");
        for (const mc of result.validation.missingCoverage) {
          lines.push(`- **${mc.requirementId}**: ${mc.reason}`);
        }
      }
      if (result.validation.duplicatedCases.length > 0) {
        lines.push("### Duplicated Cases");
        for (const dc of result.validation.duplicatedCases) {
          lines.push(`- **${dc.caseIds.join(", ")}**: ${dc.reason}`);
        }
      }
      lines.push("");
    }

    return lines.join("\n");
  }
}
