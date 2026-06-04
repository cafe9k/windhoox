import type { AgentEvent } from "../../../types/agent";

export interface AgentState {
  sessionId: string;
  status: "idle" | "running" | "completed" | "failed";
  requirement: string;
  sourcesRead: string[];
  insights: Array<{
    id: string;
    businessRule?: string;
    risk?: string;
    evidence?: string;
    confidence: "high" | "medium" | "low";
  }>;
  questions: Array<{
    id: string;
    category: "product" | "engineering" | "qa";
    question: string;
  }>;
  cases: Array<{
    id: string;
    title: string;
    description: string;
    preconditions: string[];
    steps: string[];
    expectedResult: string;
    status: "pending" | "accepted" | "rejected" | "ask_product" | "ask_engineering" | "needs_context";
  }>;
  coverage: Array<{
    requirementId: string;
    caseIds: string[];
  }>;
  error?: string;
  artifacts?: {
    conversationPath: string;
    insightPath: string;
    casesPath: string;
    coveragePath: string;
  };
  /** For continued sessions, references the previous session's ID. */
  previousSessionId?: string;
  /** Round number for multi-turn conversations (1 = initial, 2+ = continued). */
  round?: number;
}

let insightCounter = 0;

function ensureState(state: AgentState | null, sessionId?: string): AgentState {
  if (state) return state;
  return {
    sessionId: sessionId || "",
    status: "running",
    requirement: "",
    sourcesRead: [],
    insights: [],
    questions: [],
    cases: [],
    coverage: []
  };
}

export function agentStateReducer(state: AgentState | null, event: AgentEvent): AgentState | null {
  switch (event.type) {
    case "run_started": {
      insightCounter = 0;
      return {
        sessionId: event.sessionId,
        status: "running",
        requirement: "",
        sourcesRead: [],
        insights: [],
        questions: [],
        cases: [],
        coverage: [],
        round: 1,
      };
    }

    case "run_continued": {
      insightCounter = 0;
      const prevRound = state?.round || 1;
      return {
        sessionId: event.sessionId,
        status: "running",
        requirement: state?.requirement || "",
        sourcesRead: [],
        insights: [],
        questions: [],
        cases: [],
        coverage: [],
        previousSessionId: event.previousSessionId,
        round: prevRound + 1,
      };
    }

    case "reading_sources": {
      const s = ensureState(state, event.sessionId);
      return {
        ...s,
        sourcesRead: [...s.sourcesRead, event.source],
      };
    }

    case "requirement_insight": {
      const s = ensureState(state, event.sessionId);
      insightCounter++;
      return {
        ...s,
        insights: [
          ...s.insights,
          {
            id: `insight-${s.sessionId.slice(0, 8)}-${insightCounter}`,
            businessRule: event.insight.businessRule,
            risk: event.insight.risk,
            evidence: event.insight.evidence,
            confidence: event.insight.confidence
          }
        ]
      };
    }

    case "missing_questions": {
      const s = ensureState(state, event.sessionId);
      return {
        ...s,
        questions: event.questions
      };
    }

    case "case_candidates": {
      const s = ensureState(state, event.sessionId);
      return {
        ...s,
        cases: event.cases
      };
    }

    case "coverage_matrix": {
      const s = ensureState(state, event.sessionId);
      return {
        ...s,
        coverage: event.matrix
      };
    }

    case "run_completed": {
      const s = ensureState(state, event.sessionId);
      return {
        ...s,
        status: "completed",
        artifacts: event.artifactPaths
      };
    }

    case "run_failed": {
      const s = ensureState(state, event.sessionId);
      return {
        ...s,
        status: "failed",
        error: event.error
      };
    }

    case "case_reviewed": {
      if (!state) return state;
      return {
        ...state,
        cases: state.cases.map((c) =>
          c.id === event.caseId ? { ...c, status: event.status } : c
        )
      };
    }

    default:
      return state;
  }
}
