import { describe, it, expect } from "vitest";
import { agentStateReducer } from "./agentState";
import type { AgentEvent, RequirementInsightEvent, CaseCandidatesEvent, AgentSourceReadingEvent } from "../../../types/agent";

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
    expect(state.sourcesRead).toEqual([]);
  });

  it("adds insight on requirement_insight event", () => {
    const initialState = {
      sessionId: "test-123",
      status: "running" as const,
      requirement: "test",
      sourcesRead: [],
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

  it("generates deterministic insight IDs", () => {
    // Start a fresh session to reset the counter
    const startEvent: AgentEvent = {
      type: "run_started",
      sessionId: "abc12345-uuid",
      taskId: "task-1",
      timestamp: Date.now()
    };

    const insightEvent: RequirementInsightEvent = {
      type: "requirement_insight",
      sessionId: "abc12345-uuid",
      insight: { confidence: "medium" },
      timestamp: Date.now()
    };

    let state = agentStateReducer(null, startEvent);
    state = agentStateReducer(state, insightEvent);
    expect(state.insights[0].id).toBe("insight-abc12345-1");

    state = agentStateReducer(state, insightEvent);
    expect(state.insights[1].id).toBe("insight-abc12345-2");
  });

  it("resets insight counter on new run_started", () => {
    const startEvent: AgentEvent = {
      type: "run_started",
      sessionId: "abc12345-uuid",
      taskId: "task-1",
      timestamp: Date.now()
    };

    const insightEvent: RequirementInsightEvent = {
      type: "requirement_insight",
      sessionId: "abc12345-uuid",
      insight: { confidence: "high" },
      timestamp: Date.now()
    };

    let state = agentStateReducer(null, startEvent);
    state = agentStateReducer(state, insightEvent);
    expect(state.insights[0].id).toBe("insight-abc12345-1");

    // New session resets counter
    state = agentStateReducer(state, { ...startEvent, sessionId: "def67890-uuid" });
    state = agentStateReducer(state, { ...insightEvent, sessionId: "def67890-uuid" });
    expect(state.insights[0].id).toBe("insight-def67890-1");
  });

  it("accumulates sources on reading_sources events", () => {
    const initialState = {
      sessionId: "test-123",
      status: "running" as const,
      requirement: "test",
      sourcesRead: [],
      insights: [],
      questions: [],
      cases: [],
      coverage: []
    };

    const event1: AgentSourceReadingEvent = {
      type: "reading_sources",
      sessionId: "test-123",
      source: "requirement-text",
      timestamp: Date.now()
    };

    const event2: AgentSourceReadingEvent = {
      type: "reading_sources",
      sessionId: "test-123",
      source: "src/app.tsx",
      timestamp: Date.now()
    };

    let state = agentStateReducer(initialState, event1);
    expect(state.sourcesRead).toEqual(["requirement-text"]);

    state = agentStateReducer(state, event2);
    expect(state.sourcesRead).toEqual(["requirement-text", "src/app.tsx"]);
  });

  it("sets cases on case_candidates event", () => {
    const initialState = {
      sessionId: "test-123",
      status: "running" as const,
      requirement: "test",
      sourcesRead: [],
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
      sourcesRead: [],
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
      sourcesRead: [],
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

  it("initializes continued state on run_continued event", () => {
    const prevState = {
      sessionId: "prev-session",
      status: "completed" as const,
      requirement: "original requirement",
      sourcesRead: ["file1.ts"],
      insights: [{ id: "insight-1", businessRule: "rule", confidence: "high" as const }],
      questions: [{ id: "q-1", category: "product" as const, question: "what?" }],
      cases: [{ id: "TC-001", title: "case", description: "d", preconditions: [], steps: [], expectedResult: "e", status: "pending" as const }],
      coverage: [],
      round: 1,
    };

    const event: AgentEvent = {
      type: "run_continued",
      sessionId: "new-session",
      previousSessionId: "prev-session",
      timestamp: Date.now(),
    };

    const state = agentStateReducer(prevState, event);

    expect(state.sessionId).toBe("new-session");
    expect(state.status).toBe("running");
    expect(state.previousSessionId).toBe("prev-session");
    expect(state.round).toBe(2);
    // Should reset transient state but preserve requirement
    expect(state.requirement).toBe("original requirement");
    expect(state.insights).toEqual([]);
    expect(state.cases).toEqual([]);
    expect(state.sourcesRead).toEqual([]);
  });

  it("increments round on multiple run_continued events", () => {
    const state1 = agentStateReducer(null, {
      type: "run_started",
      sessionId: "s1",
      taskId: "task-1",
      timestamp: Date.now(),
    } as AgentEvent);
    expect(state1.round).toBe(1);

    const state2 = agentStateReducer(state1, {
      type: "run_continued",
      sessionId: "s2",
      previousSessionId: "s1",
      timestamp: Date.now(),
    } as AgentEvent);
    expect(state2.round).toBe(2);

    const state3 = agentStateReducer(state2, {
      type: "run_continued",
      sessionId: "s3",
      previousSessionId: "s2",
      timestamp: Date.now(),
    } as AgentEvent);
    expect(state3.round).toBe(3);
  });
});
