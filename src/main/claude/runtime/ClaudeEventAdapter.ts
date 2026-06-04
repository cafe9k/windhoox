import type {
  AgentEvent,
  AgentRunStartedEvent,
  AgentSourceReadingEvent,
  RequirementInsightEvent,
  MissingQuestionsEvent,
  CaseCandidatesEvent,
  CoverageMatrixEvent,
} from "../../../types/agent.js";
import type { WindhooxAgentResult } from "../../schemas/windhooxAgentResult.js";

// ─── EventAdapter class ───

/**
 * Instance-based event adapter with per-session ID counters.
 * Replaces the previous module-level global counters which leaked state across sessions.
 */
export class EventAdapter {
  private questionCounter = 0;
  private caseCounter = 0;

  private autoQuestionId(): string {
    this.questionCounter++;
    return `q-auto-${this.questionCounter}`;
  }

  private autoCaseId(): string {
    this.caseCounter++;
    return `TC-auto-${String(this.caseCounter).padStart(3, "0")}`;
  }

  /** Reset counters for this instance. */
  resetCounters(): void {
    this.questionCounter = 0;
    this.caseCounter = 0;
  }

  /**
   * Convert a validated WindhooxAgentResult into an ordered sequence of AgentEvents.
   *
   * Event order:
   * 1. run_started (provided externally, not generated here)
   * 2. reading_sources (provided externally, not generated here)
   * 3. One requirement_insight per insight
   * 4. One missing_questions (if any questions exist)
   * 5. One case_candidates (if any cases exist)
   * 6. One coverage_matrix (if any coverage entries exist)
   * 7. run_completed (provided externally — artifact paths are not known here)
   */
  resultToAgentEvents(
    result: WindhooxAgentResult,
    sessionId: string,
    baseTimestamp: number = Date.now(),
  ): AgentEvent[] {
    const events: AgentEvent[] = [];
    let ts = baseTimestamp;

    // ── Insights → requirement_insight events ──
    for (const insight of result.insights) {
      const event: RequirementInsightEvent = {
        type: "requirement_insight",
        sessionId,
        insight: {
          businessRule: insight.businessRule,
          risk: insight.risk,
          evidence: insight.evidence,
          confidence: insight.confidence,
        },
        timestamp: ts++,
      };
      events.push(event);
    }

    // ── Questions → single missing_questions event ──
    if (result.questions.length > 0) {
      const questions = result.questions.map((q) => ({
        id: q.id || this.autoQuestionId(),
        category: q.category,
        question: q.question,
      }));

      const event: MissingQuestionsEvent = {
        type: "missing_questions",
        sessionId,
        questions,
        timestamp: ts++,
      };
      events.push(event);
    }

    // ── Cases → single case_candidates event ──
    if (result.cases.length > 0) {
      const cases = result.cases.map((c) => ({
        id: c.id || this.autoCaseId(),
        title: c.title,
        description: c.description,
        preconditions: c.preconditions,
        steps: c.steps,
        expectedResult: c.expectedResult,
        status: "pending" as const,
      }));

      const event: CaseCandidatesEvent = {
        type: "case_candidates",
        sessionId,
        cases,
        timestamp: ts++,
      };
      events.push(event);
    }

    // ── Coverage → single coverage_matrix event ──
    if (result.coverage.length > 0) {
      const event: CoverageMatrixEvent = {
        type: "coverage_matrix",
        sessionId,
        matrix: result.coverage.map((entry) => ({
          requirementId: entry.requirementId,
          caseIds: entry.caseIds,
        })),
        timestamp: ts++,
      };
      events.push(event);
    }

    return events;
  }
}

// ─── Module-level convenience (backward-compatible) ───

const defaultAdapter = new EventAdapter();

/**
 * Reset auto-ID counters on the default module-level adapter (useful for tests).
 */
export function resetAutoIdCounters(): void {
  defaultAdapter.resetCounters();
}

// ─── Event creators (pure functions, no state) ───

export function createRunStartedEvent(
  sessionId: string,
  timestamp: number,
): AgentRunStartedEvent {
  return {
    type: "run_started",
    sessionId,
    taskId: `task-${sessionId}`,
    timestamp,
  };
}

export function createReadingSourceEvents(
  sessionId: string,
  sources: string[],
  baseTimestamp: number,
): AgentSourceReadingEvent[] {
  return sources.map((source, i) => ({
    type: "reading_sources" as const,
    sessionId,
    source,
    timestamp: baseTimestamp + i,
  }));
}

// ─── Main conversion (backward-compatible wrapper) ───

/**
 * Convert a validated WindhooxAgentResult into an ordered sequence of AgentEvents.
 * Uses the default module-level EventAdapter instance.
 *
 * For per-session isolation, instantiate `EventAdapter` directly.
 */
export function resultToAgentEvents(
  result: WindhooxAgentResult,
  sessionId: string,
  baseTimestamp: number = Date.now(),
): AgentEvent[] {
  return defaultAdapter.resultToAgentEvents(result, sessionId, baseTimestamp);
}
