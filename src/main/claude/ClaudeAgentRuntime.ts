import type { AgentEvent } from "../../types/agent.js";
import type {
  AgentRuntime,
  AnalysisInput,
  ContinueAnalysisInput,
  AnalysisResult,
  AnalysisOptions,
} from "../agent-runtime/types.js";
import type { ClaudeRuntime } from "./runtime/ClaudeRuntime.js";
import { extractResultWithRetry } from "./runtime/ClaudeResultExtractor.js";
import {
  EventAdapter,
  createRunStartedEvent,
  createReadingSourceEvents,
} from "./runtime/ClaudeEventAdapter.js";
import type { Message } from "@anthropic-ai/sdk/resources/messages.js";
import { ArtifactWriter } from "../storage/ArtifactWriter.js";
import type { SessionMetadata } from "../storage/SessionTypes.js";
import { SessionStore } from "../storage/SessionStore.js";
import type { WindhooxAgentResult } from "../schemas/windhooxAgentResult.js";
import { windhooxAgentResultSchema } from "../schemas/windhooxAgentResult.js";

/**
 * ClaudeAgentRuntime — implements AgentRuntime using Claude (Anthropic API).
 *
 * Orchestrates the full analysis pipeline:
 *   startAnalysis → Claude API → extractResult → resultToAgentEvents → writeArtifacts
 *   continueAnalysis → load previous session → build continuation prompt → same pipeline
 *
 * The IPC layer (agent-handlers) only needs to call runAnalysis()/continueAnalysis() and
 * forward events to the renderer.
 */
export class ClaudeAgentRuntime implements AgentRuntime {
  private claudeRuntime: ClaudeRuntime;
  private eventAdapter = new EventAdapter();
  private artifactWriter: ArtifactWriter;
  private sessionStore: SessionStore;

  constructor(claudeRuntime: ClaudeRuntime, artifactWriter?: ArtifactWriter, sessionStore?: SessionStore) {
    this.claudeRuntime = claudeRuntime;
    this.artifactWriter = artifactWriter ?? new ArtifactWriter();
    this.sessionStore = sessionStore ?? new SessionStore();
  }

  async runAnalysis(input: AnalysisInput, onEvent: (event: AgentEvent) => void, options?: AnalysisOptions): Promise<AnalysisResult> {
    const { sessionId, requirementText, contextReferences } = input;
    const timestamp = Date.now();
    const signal = options?.signal;

    try {
      // Check if already cancelled
      if (signal?.aborted) {
        throw new DOMException("Analysis was cancelled", "AbortError");
      }

      // 1. run_started
      onEvent(createRunStartedEvent(sessionId, timestamp));

      // 2. reading_sources (placeholder — will be real when Agent Loop + Tool Use is implemented)
      const sources = ["requirement-text", ...(contextReferences || [])];
      const readingEvents = createReadingSourceEvents(sessionId, sources, timestamp + 1);
      readingEvents.forEach((e) => onEvent(e));

      // 3. Call Claude (with AbortSignal)
      const finalMessage = await this.claudeRuntime.startAnalysis({
        requirementText,
        contextReferences,
        sessionId,
      }, {}, signal);

      // 4. Extract JSON result — try structured output first, then text extraction
      const extracted = extractStructuredResult(finalMessage);

      if (!extracted.success) {
        onEvent({
          type: "run_failed",
          sessionId,
          error: `结果解析失败: ${extracted.error.message}`,
          recoverable: true,
          retryEligible: true,
          timestamp: Date.now(),
        });
        return { sessionId, success: false, error: `结果解析失败: ${extracted.error.message}` };
      }

      // 5. Convert to AgentEvents and emit
      this.eventAdapter.resetCounters();
      const businessEvents = this.eventAdapter.resultToAgentEvents(extracted.data, sessionId);
      businessEvents.forEach((e) => onEvent(e));

      // 6. Write artifacts
      const allEvents = [
        createRunStartedEvent(sessionId, timestamp),
        ...readingEvents,
        ...businessEvents,
      ];

      const metadata: SessionMetadata = {
        id: sessionId,
        createdAt: timestamp,
        status: "completed",
        requirementText,
        model: this.claudeRuntime.getConfig().model,
        totalTokens: finalMessage.usage.input_tokens + finalMessage.usage.output_tokens,
        duration: Date.now() - timestamp,
      };

      const paths = this.artifactWriter.writeAll(
        sessionId,
        requirementText,
        contextReferences || [],
        allEvents,
        extracted.data,
        finalMessage,
        metadata,
      );

      // 7. run_completed
      const completedEvent: AgentEvent = {
        type: "run_completed",
        sessionId,
        artifactPaths: {
          conversationPath: paths.conversationPath,
          insightPath: paths.insightPath,
          casesPath: paths.casesPath,
          coveragePath: paths.coveragePath,
        },
        timestamp: Date.now(),
      };
      onEvent(completedEvent);

      return {
        sessionId,
        success: true,
        artifactPaths: {
          conversationPath: paths.conversationPath,
          insightPath: paths.insightPath,
          casesPath: paths.casesPath,
          coveragePath: paths.coveragePath,
        },
      };
    } catch (error) {
      const isAborted = error instanceof DOMException && error.name === "AbortError";
      const errorMsg = isAborted ? "分析已取消" : (error instanceof Error ? error.message : "分析运行失败");
      onEvent({
        type: "run_failed",
        sessionId,
        error: errorMsg,
        recoverable: !isAborted,
        retryEligible: !isAborted,
        timestamp: Date.now(),
      });
      return { sessionId, success: false, error: errorMsg };
    }
  }

  async continueAnalysis(input: ContinueAnalysisInput, onEvent: (event: AgentEvent) => void, options?: AnalysisOptions): Promise<AnalysisResult> {
    const { sessionId, previousSessionId, feedback } = input;
    const timestamp = Date.now();
    const signal = options?.signal;

    try {
      if (signal?.aborted) {
        throw new DOMException("Analysis was cancelled", "AbortError");
      }

      // 1. Load previous session data
      const prevSession = this.sessionStore.loadSession(previousSessionId);
      if (!prevSession) {
        onEvent({
          type: "run_failed",
          sessionId,
          error: `无法加载上一轮会话: ${previousSessionId}`,
          recoverable: false,
          retryEligible: false,
          timestamp: Date.now(),
        });
        return { sessionId, success: false, error: `无法加载上一轮会话: ${previousSessionId}` };
      }

      // 2. Build continuation prompt (with optional token budget)
      const requirementText = prevSession.metadata.requirementText;
      const tokenBudget = input.tokenBudget ?? 4000;
      const continuationPrompt = buildContinuationPrompt(requirementText, prevSession, feedback, tokenBudget);

      // 3. run_started
      onEvent(createRunStartedEvent(sessionId, timestamp));

      // 4. reading_sources — include previous session sources + feedback source
      const sources = ["previous-session", "user-feedback"];
      const readingEvents = createReadingSourceEvents(sessionId, sources, timestamp + 1);
      readingEvents.forEach((e) => onEvent(e));

      // 5. Call Claude with continuation prompt (fresh conversation, not session resume)
      const finalMessage = await this.claudeRuntime.startAnalysis({
        requirementText: continuationPrompt,
        contextReferences: [],
        sessionId,
      }, {}, signal);

      // 6. Extract JSON result — try structured output first, then text extraction
      const extracted = extractStructuredResult(finalMessage);

      if (!extracted.success) {
        onEvent({
          type: "run_failed",
          sessionId,
          error: `结果解析失败: ${extracted.error.message}`,
          recoverable: true,
          retryEligible: true,
          timestamp: Date.now(),
        });
        return { sessionId, success: false, error: `结果解析失败: ${extracted.error.message}` };
      }

      // 7. Convert to AgentEvents and emit
      this.eventAdapter.resetCounters();
      const businessEvents = this.eventAdapter.resultToAgentEvents(extracted.data, sessionId);
      businessEvents.forEach((e) => onEvent(e));

      // 8. Write artifacts
      const allEvents = [
        createRunStartedEvent(sessionId, timestamp),
        ...readingEvents,
        ...businessEvents,
      ];

      const metadata: SessionMetadata = {
        id: sessionId,
        createdAt: timestamp,
        status: "completed",
        requirementText,
        model: this.claudeRuntime.getConfig().model,
        totalTokens: finalMessage.usage.input_tokens + finalMessage.usage.output_tokens,
        duration: Date.now() - timestamp,
        previousSessionId,
      };

      const paths = this.artifactWriter.writeAll(
        sessionId,
        requirementText,
        [],
        allEvents,
        extracted.data,
        finalMessage,
        metadata,
      );

      // 9. run_completed
      const completedEvent: AgentEvent = {
        type: "run_completed",
        sessionId,
        artifactPaths: {
          conversationPath: paths.conversationPath,
          insightPath: paths.insightPath,
          casesPath: paths.casesPath,
          coveragePath: paths.coveragePath,
        },
        timestamp: Date.now(),
      };
      onEvent(completedEvent);

      return {
        sessionId,
        success: true,
        artifactPaths: {
          conversationPath: paths.conversationPath,
          insightPath: paths.insightPath,
          casesPath: paths.casesPath,
          coveragePath: paths.coveragePath,
        },
      };
    } catch (error) {
      const isAborted = error instanceof DOMException && error.name === "AbortError";
      const errorMsg = isAborted ? "分析已取消" : (error instanceof Error ? error.message : "继续分析运行失败");
      onEvent({
        type: "run_failed",
        sessionId,
        error: errorMsg,
        recoverable: !isAborted,
        retryEligible: !isAborted,
        timestamp: Date.now(),
      });
      return { sessionId, success: false, error: errorMsg };
    }
  }

  getModel(): string {
    return this.claudeRuntime.getConfig().model;
  }
}

function extractFinalText(message: Message): string {
  return message.content
    .filter((block) => block.type === "text")
    .map((block) => (block as any).text)
    .join("\n");
}

/**
 * Extract WindhooxAgentResult from a Claude API response.
 *
 * Priority:
 * 1. If the response has `parsed_output` (structured output via output_config),
 *    validate it with zod and return directly — no text parsing needed.
 * 2. Otherwise, fall back to text extraction (code fence, JSON object, repair).
 */
function extractStructuredResult(
  message: Message,
): { success: true; data: WindhooxAgentResult } | { success: false; error: { kind: string; message: string } } {
  // Path 1: Structured output — Claude returned parsed JSON via output_config.format
  const parsedOutput = (message as any).parsed_output;
  if (parsedOutput !== undefined && parsedOutput !== null) {
    // Validate with zod to ensure type safety (parsed_output should already conform,
    // but we validate defensively)
    const result = windhooxAgentResultSchema.safeParse(parsedOutput);
    if (result.success) {
      return { success: true, data: result.data };
    }
    // Structured output didn't pass validation — fall through to text extraction
  }

  // Path 2: Text extraction — parse JSON from Claude's text response
  const finalText = extractFinalText(message);
  const extracted = extractResultWithRetry(finalText);
  if (extracted.success) {
    return { success: true, data: extracted.data };
  }

  return {
    success: false,
    error: { kind: extracted.error.kind, message: extracted.error.message },
  };
}

/**
 * Rough token estimation: Chinese chars ≈ 1 token, ASCII ≈ 0.25 tokens.
 */
function estimateTokens(text: string): number {
  let tokens = 0;
  for (const char of text) {
    tokens += char.charCodeAt(0) > 127 ? 1 : 0.25;
  }
  return Math.ceil(tokens);
}

/**
 * Build a continuation prompt that includes the original requirement,
 * previous results summary, and user feedback.
 *
 * If the prompt would exceed tokenBudget, aggressively prunes non-critical
 * sections (insights, case details, questions) while preserving user feedback.
 */
function buildContinuationPrompt(
  originalRequirement: string,
  prevSession: { metadata: SessionMetadata; events: AgentEvent[] },
  feedback: ContinueAnalysisInput["feedback"],
  tokenBudget = 4000,
): string {
  const lines: string[] = [
    "## 继续分析任务",
    "",
    "这是对上一轮分析的继续。请根据用户的反馈调整和改进分析结果。",
    "",
    "### 原始需求",
    originalRequirement,
    "",
  ];

  // Summarize previous results from events
  const insights = prevSession.events.filter((e) => e.type === "requirement_insight");
  const cases = prevSession.events.find((e) => e.type === "case_candidates");
  const questions = prevSession.events.find((e) => e.type === "missing_questions");

  // --- Insights section ---
  if (insights.length > 0) {
    lines.push("### 上一轮分析见解");
    for (const e of insights) {
      if (e.type === "requirement_insight") {
        const parts = [
          e.insight.businessRule ? `业务规则: ${e.insight.businessRule}` : null,
          e.insight.risk ? `风险: ${e.insight.risk}` : null,
          e.insight.evidence ? `证据: ${e.insight.evidence}` : null,
        ].filter(Boolean);
        lines.push(`- [${e.insight.confidence}] ${parts.join("; ")}`);
      }
    }
    lines.push("");
  }

  // --- Cases section (prunable) ---
  if (cases && cases.type === "case_candidates") {
    lines.push(`### 上一轮测试用例 (共 ${cases.cases.length} 个)`);
    for (const c of cases.cases) {
      lines.push(`- [${c.id}] ${c.title}`);
    }
    lines.push("");
  }

  // --- Questions section (prunable) ---
  if (questions && questions.type === "missing_questions") {
    lines.push("### 上一轮待澄清问题");
    for (const q of questions.questions) {
      lines.push(`- [${q.id}] [${q.category}] ${q.question}`);
    }
    lines.push("");
  }

  // --- User feedback (always keep) ---
  lines.push("### 用户反馈");

  if (feedback.acceptedCaseIds.length > 0) {
    lines.push(`**接受的测试用例**: ${feedback.acceptedCaseIds.join(", ")}`);
    lines.push("请保留这些用例，它们是正确的示例。");
    lines.push("");
  }

  if (feedback.rejectedCaseIds.length > 0) {
    lines.push(`**拒绝的测试用例**: ${feedback.rejectedCaseIds.join(", ")}`);
    lines.push("请移除或改进这些用例，它们是反面教材。");
    lines.push("");
  }

  if (feedback.unresolvedQuestions.length > 0) {
    lines.push("**用户回答的待澄清问题**:");
    for (const q of feedback.unresolvedQuestions) {
      lines.push(`- [${q.id}] [${q.category}] ${q.text}`);
    }
    lines.push("请根据这些回答调整分析结果。");
    lines.push("");
  }

  lines.push("### 要求");
  lines.push("请基于以上反馈，重新生成完整的分析结果。输出格式与首次分析相同。");
  lines.push("保留用户接受的用例，移除或替换用户拒绝的用例，并根据用户回答的问题补充新的见解和用例。");

  let prompt = lines.join("\n");

  // --- Token budget enforcement ---
  let tokens = estimateTokens(prompt);
  if (tokens > tokenBudget) {
    // Prune strategy: drop insights first, then questions, then case summaries
    const prunedLines = lines.filter((line) => {
      if (line.startsWith("### 上一轮分析见解")) return false;
      if (line.startsWith("- [high]") || line.startsWith("- [medium]") || line.startsWith("- [low]")) return false;
      if (line.startsWith("### 上一轮待澄清问题")) return false;
      if (line.startsWith("- [q-")) return false;
      return true;
    });

    prompt = prunedLines.join("\n");
    tokens = estimateTokens(prompt);

    // If still over budget, prune case summaries too (keep count only)
    if (tokens > tokenBudget) {
      const aggressivelyPruned = prunedLines.filter((line) => {
        if (line.startsWith("- [TC-")) return false;
        return true;
      });
      prompt = aggressivelyPruned.join("\n");
      tokens = estimateTokens(prompt);
    }
  }

  return prompt;
}
