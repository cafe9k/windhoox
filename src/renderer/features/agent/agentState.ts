import type { AgentEvent } from "../../../types/agent";

export interface AgentState {
  sessionId: string;
  status: "idle" | "running" | "completed" | "failed";
  requirement: string;
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
}

function ensureState(state: AgentState | null, sessionId?: string): AgentState {
  if (state) return state;
  return {
    sessionId: sessionId || "",
    status: "running",
    requirement: "",
    insights: [],
    questions: [],
    cases: [],
    coverage: []
  };
}

export function agentStateReducer(state: AgentState | null, event: AgentEvent): AgentState | null {
  switch (event.type) {
    case "run_started": {
      return {
        sessionId: event.sessionId,
        status: "running",
        requirement: "",
        insights: [],
        questions: [],
        cases: [],
        coverage: []
      };
    }

    case "requirement_insight": {
      const s = ensureState(state, event.sessionId);
      return {
        ...s,
        insights: [
          ...s.insights,
          {
            id: `insight-${Date.now()}`,
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

    case "reading_sources":
    default:
      return state;
  }
}
