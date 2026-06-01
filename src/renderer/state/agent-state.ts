import type { AgentEvent } from "../../types/agent";

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
      if (!state) return state;
      return {
        ...state,
        insights: [
          ...state.insights,
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
      if (!state) return state;
      return {
        ...state,
        questions: event.questions
      };
    }

    case "case_candidates": {
      if (!state) return state;
      return {
        ...state,
        cases: event.cases
      };
    }

    case "coverage_matrix": {
      if (!state) return state;
      return {
        ...state,
        coverage: event.matrix
      };
    }

    case "run_completed": {
      if (!state) return state;
      return {
        ...state,
        status: "completed",
        artifacts: event.artifactPaths
      };
    }

    case "run_failed": {
      if (!state) return state;
      return {
        ...state,
        status: "failed",
        error: event.error
      };
    }

    case "reading_sources":
    default:
      return state;
  }
}
