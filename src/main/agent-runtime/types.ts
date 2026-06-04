import type { AgentEvent } from "../../types/agent.js";

/**
 * Input for starting a new analysis session.
 */
export interface AnalysisInput {
  requirementText: string;
  contextReferences?: string[];
  sessionId: string;
}

/**
 * Input for continuing an existing analysis session.
 */
export interface ContinueAnalysisInput {
  sessionId: string;
  previousSessionId: string;
  feedback: {
    acceptedCaseIds: string[];
    rejectedCaseIds: string[];
    unresolvedQuestions: Array<{
      id: string;
      category: string;
      text: string;
    }>;
  };
  /** Optional token budget for the continuation prompt. If exceeded, context will be aggressively pruned. */
  tokenBudget?: number;
}

/**
 * Callback for emitting events during analysis.
 */
export type EventCallback = (event: AgentEvent) => void;

/**
 * Result of an analysis run.
 */
export interface AnalysisResult {
  sessionId: string;
  success: boolean;
  error?: string;
  artifactPaths?: {
    conversationPath: string;
    insightPath: string;
    casesPath: string;
    coveragePath: string;
  };
}

/**
 * Options for analysis operations.
 */
export interface AnalysisOptions {
  /** Optional AbortSignal to cancel the running analysis. */
  signal?: AbortSignal;
}

/**
 * AgentRuntime — abstract interface for AI analysis engines.
 *
 * Implementations (e.g., ClaudeRuntime) provide the actual AI interaction,
 * while consumers (e.g., agent-handlers) only depend on this interface.
 */
export interface AgentRuntime {
  /**
   * Run a new analysis session.
   * Events are emitted via the onEvent callback as they occur.
   * Accepts an optional AbortSignal to cancel the operation.
   */
  runAnalysis(input: AnalysisInput, onEvent: EventCallback, options?: AnalysisOptions): Promise<AnalysisResult>;

  /**
   * Continue an existing analysis session with feedback.
   */
  continueAnalysis(input: ContinueAnalysisInput, onEvent: EventCallback, options?: AnalysisOptions): Promise<AnalysisResult>;

  /**
   * Get the model identifier used by this runtime.
   */
  getModel(): string;
}
