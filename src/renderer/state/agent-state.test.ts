import { describe, it, expect } from "vitest";
import { agentStateReducer } from "./agent-state";
import type { AgentEvent, RequirementInsightEvent, CaseCandidatesEvent } from "../../types/agent";

describe("agentStateReducer", () => {
  it("initializes state on run_started event", () => {
    const event: AgentEvent = {
      type: "run_started",
      sessionId: "test-123",
      taskId: "task-1",
      timestamp: Date.now()
    };

    const state = agentStateReducer(null, event);

    expect(state.sessionId).toBe("test-123");
    expect(state.status).toBe("running");
    expect(state.insights).toEqual([]);
    expect(state.cases).toEqual([]);
  });

  it("adds insight on requirement_insight event", () => {
    const initialState = {
      sessionId: "test-123",
      status: "running" as const,
      requirement: "test",
      insights: [],
      questions: [],
      cases: [],
      coverage: []
    };

    const event: RequirementInsightEvent = {
      type: "requirement_insight",
      sessionId: "test-123",
      insight: {
        businessRule: "Test rule",
        confidence: "high"
      },
      timestamp: Date.now()
    };

    const state = agentStateReducer(initialState, event);

    expect(state.insights).toHaveLength(1);
    expect(state.insights[0].businessRule).toBe("Test rule");
    expect(state.insights[0].confidence).toBe("high");
  });

  it("sets cases on case_candidates event", () => {
    const initialState = {
      sessionId: "test-123",
      status: "running" as const,
      requirement: "test",
      insights: [],
      questions: [],
      cases: [],
      coverage: []
    };

    const event: CaseCandidatesEvent = {
      type: "case_candidates",
      sessionId: "test-123",
      cases: [
        {
          id: "case-1",
          title: "Test case",
          description: "Test description",
          preconditions: [],
          steps: ["Step 1"],
          expectedResult: "Pass",
          status: "pending"
        }
      ],
      timestamp: Date.now()
    };

    const state = agentStateReducer(initialState, event);

    expect(state.cases).toHaveLength(1);
    expect(state.cases[0].title).toBe("Test case");
    expect(state.cases[0].status).toBe("pending");
  });

  it("marks state as completed on run_completed event", () => {
    const initialState = {
      sessionId: "test-123",
      status: "running" as const,
      requirement: "test",
      insights: [],
      questions: [],
      cases: [],
      coverage: []
    };

    const event: AgentEvent = {
      type: "run_completed",
      sessionId: "test-123",
      artifactPaths: {
        conversationPath: "/tmp/conversation.md",
        insightPath: "/tmp/insight.json",
        casesPath: "/tmp/cases.json",
        coveragePath: "/tmp/coverage.json"
      },
      timestamp: Date.now()
    };

    const state = agentStateReducer(initialState, event);

    expect(state.status).toBe("completed");
    expect(state.artifacts).toBeDefined();
  });

  it("marks state as failed on run_failed event", () => {
    const initialState = {
      sessionId: "test-123",
      status: "running" as const,
      requirement: "test",
      insights: [],
      questions: [],
      cases: [],
      coverage: []
    };

    const event: AgentEvent = {
      type: "run_failed",
      sessionId: "test-123",
      error: "Test error",
      recoverable: true,
      retryEligible: true,
      timestamp: Date.now()
    };

    const state = agentStateReducer(initialState, event);

    expect(state.status).toBe("failed");
    expect(state.error).toBe("Test error");
  });
});
