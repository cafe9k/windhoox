export interface AnalysisPayload {
  requirementText: string;
  contextReferences?: string[];
}

export interface ContinueAnalysisPayload {
  sessionId: string;
  followUpPrompt: string;
  reviewDecisions?: Record<string, string>;
}

export interface ReviewCasePayload {
  sessionId: string;
  caseId: string;
  status: "accepted" | "rejected" | "ask_product" | "ask_engineering" | "needs_context";
}

export interface LoadSessionPayload {
  sessionId: string;
}

export type AgentEventListener = (event: AgentEvent) => void;

export type AgentEvent =
  | AgentRunStartedEvent
  | AgentSourceReadingEvent
  | RequirementInsightEvent
  | MissingQuestionsEvent
  | CaseCandidatesEvent
  | CoverageMatrixEvent
  | AgentRunCompletedEvent
  | AgentRunFailedEvent;

export interface AgentRunStartedEvent {
  type: "run_started";
  sessionId: string;
  taskId: string;
  timestamp: number;
}

export interface AgentSourceReadingEvent {
  type: "reading_sources";
  sessionId: string;
  source: string;
  timestamp: number;
}

export interface RequirementInsightEvent {
  type: "requirement_insight";
  sessionId: string;
  insight: {
    businessRule?: string;
    risk?: string;
    evidence?: string;
    confidence: "high" | "medium" | "low";
  };
  timestamp: number;
}

export interface MissingQuestionsEvent {
  type: "missing_questions";
  sessionId: string;
  questions: Array<{
    id: string;
    category: "product" | "engineering" | "qa";
    question: string;
  }>;
  timestamp: number;
}

export interface CaseCandidatesEvent {
  type: "case_candidates";
  sessionId: string;
  cases: Array<{
    id: string;
    title: string;
    description: string;
    preconditions: string[];
    steps: string[];
    expectedResult: string;
    status: "pending" | "accepted" | "rejected" | "ask_product" | "ask_engineering" | "needs_context";
  }>;
  timestamp: number;
}

export interface CoverageMatrixEvent {
  type: "coverage_matrix";
  sessionId: string;
  matrix: Array<{
    requirementId: string;
    caseIds: string[];
  }>;
  timestamp: number;
}

export interface AgentRunCompletedEvent {
  type: "run_completed";
  sessionId: string;
  artifactPaths: {
    conversationPath: string;
    insightPath: string;
    casesPath: string;
    coveragePath: string;
  };
  timestamp: number;
}

export interface AgentRunFailedEvent {
  type: "run_failed";
  sessionId: string;
  error: string;
  recoverable: boolean;
  retryEligible: boolean;
  timestamp: number;
}
