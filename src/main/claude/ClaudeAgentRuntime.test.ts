import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AgentEvent } from "../../types/agent.js";
import type { WindhooxAgentResult } from "../schemas/windhooxAgentResult.js";
import type { ClaudeRuntime } from "./runtime/ClaudeRuntime.js";
import type { ArtifactWriter } from "../storage/ArtifactWriter.js";
import type { SessionStore } from "../storage/SessionStore.js";
import type { SessionData } from "../storage/SessionTypes.js";

// ─── Mocks ───

const mockStartAnalysis = vi.fn();
const mockGetConfig = vi.fn(() => ({ model: "claude-sonnet-4-5" }));
const mockExtractResult = vi.fn();
const mockWriteAll = vi.fn().mockReturnValue({
  conversationPath: "/tmp/test/conversation.md",
  insightPath: "/tmp/test/insight.json",
  casesPath: "/tmp/test/cases.json",
  coveragePath: "/tmp/test/coverage.json",
  validationPath: "/tmp/test/validation.json",
  eventsPath: "/tmp/test/events.json",
  metadataPath: "/tmp/test/metadata.json",
});
const mockLoadSession = vi.fn().mockReturnValue(null);

vi.mock("./runtime/ClaudeResultExtractor.js", () => ({
  extractResultWithRetry: (...args: any[]) => mockExtractResult(...args),
}));

vi.mock("../storage/ArtifactWriter.js", () => ({
  ArtifactWriter: vi.fn().mockImplementation(function (this: any) {
    this.writeAll = mockWriteAll;
  }),
}));

vi.mock("../storage/SessionStore.js", () => ({
  SessionStore: vi.fn().mockImplementation(function (this: any) {
    this.loadSession = mockLoadSession;
  }),
}));

// Import after mocks
import { ClaudeAgentRuntime } from "./ClaudeAgentRuntime.js";

// ─── Fixtures ───

const VALID_RESULT: WindhooxAgentResult = {
  pageUnderstanding: {
    pageType: "form",
    confidence: 0.9,
    modules: [],
    risks: [],
  },
  insights: [
    { businessRule: "test rule", risk: "test risk", evidence: "test evidence", confidence: "high" },
  ],
  questions: [
    { id: "q-1", category: "product", question: "test question" },
  ],
  cases: [
    {
      id: "TC-001",
      title: "test case",
      description: "test description",
      preconditions: [],
      steps: ["step 1"],
      expectedResult: "expected result",
    },
  ],
  coverage: [
    { requirementId: "REQ-01", caseIds: ["TC-001"] },
  ],
  validation: {
    passed: true,
    score: 100,
    missingCoverage: [],
    duplicatedCases: [],
  },
};

const MOCK_MESSAGE = {
  id: "msg_test",
  role: "assistant" as const,
  content: [{ type: "text" as const, text: JSON.stringify(VALID_RESULT) }],
  model: "claude-sonnet-4-5",
  stop_reason: "end_turn" as const,
  stop_sequence: null,
  type: "message" as const,
  usage: { input_tokens: 100, output_tokens: 50 },
};

/** Create a mock ClaudeRuntime instance. */
function createMockRuntime(): ClaudeRuntime {
  return {
    startAnalysis: mockStartAnalysis,
    getConfig: mockGetConfig,
    continueConversation: vi.fn(),
    getCurrentSession: vi.fn(),
    resetSession: vi.fn(),
    updateConfig: vi.fn(),
  } as unknown as ClaudeRuntime;
}

/** Create a mock ArtifactWriter instance. */
function createMockWriter(): ArtifactWriter {
  return { writeAll: mockWriteAll } as unknown as ArtifactWriter;
}

/** Create a mock SessionStore instance. */
function createMockSessionStore(): SessionStore {
  return { loadSession: mockLoadSession } as unknown as SessionStore;
}

// ─── Tests ───

describe("ClaudeAgentRuntime", () => {
  let runtime: ClaudeAgentRuntime;
  let collectedEvents: AgentEvent[];

  beforeEach(() => {
    vi.clearAllMocks();
    collectedEvents = [];

    runtime = new ClaudeAgentRuntime(createMockRuntime(), createMockWriter(), createMockSessionStore());

    // Default: successful analysis
    mockStartAnalysis.mockResolvedValue(MOCK_MESSAGE);
    mockExtractResult.mockReturnValue({ success: true, data: VALID_RESULT });
  });

  describe("runAnalysis", () => {
    it("emits events in correct order on success", async () => {
      const result = await runtime.runAnalysis(
        { sessionId: "test-session", requirementText: "test requirement" },
        (event) => collectedEvents.push(event),
      );

      expect(result.success).toBe(true);
      expect(result.sessionId).toBe("test-session");

      // Event order: run_started → reading_sources → business events → run_completed
      const types = collectedEvents.map((e) => e.type);
      expect(types[0]).toBe("run_started");
      expect(types[1]).toBe("reading_sources");
      // Last should be run_completed
      expect(types[types.length - 1]).toBe("run_completed");
    });

    it("emits run_started event with correct sessionId", async () => {
      await runtime.runAnalysis(
        { sessionId: "test-session", requirementText: "test" },
        (event) => collectedEvents.push(event),
      );

      const startEvent = collectedEvents[0];
      expect(startEvent.type).toBe("run_started");
      if (startEvent.type === "run_started") {
        expect(startEvent.sessionId).toBe("test-session");
      }
    });

    it("calls ArtifactWriter.writeAll with correct params", async () => {
      await runtime.runAnalysis(
        { sessionId: "test-session", requirementText: "test req", contextReferences: ["file.ts"] },
        (event) => collectedEvents.push(event),
      );

      expect(mockWriteAll).toHaveBeenCalledTimes(1);
      const callArgs = mockWriteAll.mock.calls[0];
      expect(callArgs[0]).toBe("test-session"); // sessionId
      expect(callArgs[1]).toBe("test req"); // requirementText
      expect(callArgs[2]).toEqual(["file.ts"]); // contextReferences
    });

    it("returns artifactPaths on success", async () => {
      const result = await runtime.runAnalysis(
        { sessionId: "test-session", requirementText: "test" },
        (event) => collectedEvents.push(event),
      );

      expect(result.success).toBe(true);
      expect(result.artifactPaths).toBeDefined();
      expect(result.artifactPaths!.conversationPath).toContain("conversation");
    });

    it("emits run_failed when extractResult fails", async () => {
      mockExtractResult.mockReturnValue({
        success: false,
        error: { kind: "parse_error", message: "bad json", rawSnippet: "" },
      });

      const result = await runtime.runAnalysis(
        { sessionId: "test-session", requirementText: "test" },
        (event) => collectedEvents.push(event),
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("解析失败");

      const failedEvent = collectedEvents.find((e) => e.type === "run_failed");
      expect(failedEvent).toBeDefined();
    });

    it("emits run_failed when Claude API throws", async () => {
      mockStartAnalysis.mockRejectedValue(new Error("API timeout"));

      const result = await runtime.runAnalysis(
        { sessionId: "test-session", requirementText: "test" },
        (event) => collectedEvents.push(event),
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("API timeout");

      const failedEvent = collectedEvents.find((e) => e.type === "run_failed");
      expect(failedEvent).toBeDefined();
      if (failedEvent?.type === "run_failed") {
        expect(failedEvent.recoverable).toBe(true);
        expect(failedEvent.retryEligible).toBe(true);
      }
    });

    it("uses parsed_output when available (structured output path)", async () => {
      // Simulate a response with parsed_output (from client.messages.parse)
      const messageWithParsedOutput = {
        ...MOCK_MESSAGE,
        parsed_output: VALID_RESULT,
      };
      mockStartAnalysis.mockResolvedValue(messageWithParsedOutput);

      const result = await runtime.runAnalysis(
        { sessionId: "structured-session", requirementText: "test" },
        (event) => collectedEvents.push(event),
      );

      expect(result.success).toBe(true);
      // When parsed_output is available, extractResultWithRetry should NOT be called
      expect(mockExtractResult).not.toHaveBeenCalled();
    });

    it("falls back to text extraction when parsed_output is missing", async () => {
      // MOCK_MESSAGE has no parsed_output
      const result = await runtime.runAnalysis(
        { sessionId: "text-session", requirementText: "test" },
        (event) => collectedEvents.push(event),
      );

      expect(result.success).toBe(true);
      // Should fall back to text extraction
      expect(mockExtractResult).toHaveBeenCalledTimes(1);
    });

    it("falls back to text extraction when parsed_output fails validation", async () => {
      const invalidParsedOutput = { invalid: true };
      const messageWithInvalidParsedOutput = {
        ...MOCK_MESSAGE,
        parsed_output: invalidParsedOutput,
      };
      mockStartAnalysis.mockResolvedValue(messageWithInvalidParsedOutput);

      const result = await runtime.runAnalysis(
        { sessionId: "fallback-session", requirementText: "test" },
        (event) => collectedEvents.push(event),
      );

      expect(result.success).toBe(true);
      // Should fall back to text extraction since parsed_output didn't validate
      expect(mockExtractResult).toHaveBeenCalledTimes(1);
    });

    it("emits business events from extracted result", async () => {
      await runtime.runAnalysis(
        { sessionId: "test-session", requirementText: "test" },
        (event) => collectedEvents.push(event),
      );

      const businessTypes = collectedEvents
        .filter((e) => !["run_started", "reading_sources", "run_completed"].includes(e.type))
        .map((e) => e.type);

      expect(businessTypes).toContain("requirement_insight");
      expect(businessTypes).toContain("missing_questions");
      expect(businessTypes).toContain("case_candidates");
      expect(businessTypes).toContain("coverage_matrix");
    });
  });

  describe("continueAnalysis", () => {
    const PREV_SESSION_DATA: SessionData = {
      metadata: {
        id: "prev-session",
        createdAt: Date.now() - 10000,
        status: "completed",
        requirementText: "original requirement",
        model: "claude-sonnet-4-5",
      },
      events: [
        { type: "run_started", sessionId: "prev-session", taskId: "task-prev", timestamp: 1000 },
        { type: "reading_sources", sessionId: "prev-session", source: "req", timestamp: 1001 },
        {
          type: "requirement_insight",
          sessionId: "prev-session",
          insight: { businessRule: "prev rule", confidence: "high" },
          timestamp: 1002,
        },
        {
          type: "case_candidates",
          sessionId: "prev-session",
          cases: [
            { id: "TC-001", title: "prev case 1", description: "d", preconditions: [], steps: [], expectedResult: "e", status: "pending" },
            { id: "TC-002", title: "prev case 2", description: "d2", preconditions: [], steps: [], expectedResult: "e2", status: "pending" },
          ],
          timestamp: 1003,
        },
        {
          type: "missing_questions",
          sessionId: "prev-session",
          questions: [{ id: "q-1", category: "product" as const, question: "what?" }],
          timestamp: 1004,
        },
        {
          type: "run_completed",
          sessionId: "prev-session",
          artifactPaths: { conversationPath: "/t", insightPath: "/t", casesPath: "/t", coveragePath: "/t" },
          timestamp: 1005,
        },
      ],
      paths: {
        conversationPath: "/tmp/prev/conversation.md",
        insightPath: "/tmp/prev/insight.json",
        casesPath: "/tmp/prev/cases.json",
        coveragePath: "/tmp/prev/coverage.json",
        validationPath: "/tmp/prev/validation.json",
        eventsPath: "/tmp/prev/events.json",
        metadataPath: "/tmp/prev/metadata.json",
      },
    };

    it("loads previous session and emits events on success", async () => {
      mockLoadSession.mockReturnValue(PREV_SESSION_DATA);

      const result = await runtime.continueAnalysis(
        {
          sessionId: "new-session",
          previousSessionId: "prev-session",
          feedback: {
            acceptedCaseIds: ["TC-001"],
            rejectedCaseIds: ["TC-002"],
            unresolvedQuestions: [{ id: "q-1", category: "product", text: "answer" }],
          },
        },
        (event) => collectedEvents.push(event),
      );

      expect(result.success).toBe(true);
      expect(result.sessionId).toBe("new-session");

      // Should have loaded previous session
      expect(mockLoadSession).toHaveBeenCalledWith("prev-session");

      // Should have called Claude with a continuation prompt (not the original requirement)
      expect(mockStartAnalysis).toHaveBeenCalledTimes(1);
      const callArgs = mockStartAnalysis.mock.calls[0][0] as { requirementText: string };
      expect(callArgs.requirementText).toContain("继续分析任务");
      expect(callArgs.requirementText).toContain("original requirement");
      expect(callArgs.requirementText).toContain("TC-001");
      expect(callArgs.requirementText).toContain("TC-002");

      // Events: run_started → reading_sources → business → run_completed
      const types = collectedEvents.map((e) => e.type);
      expect(types[0]).toBe("run_started");
      expect(types[1]).toBe("reading_sources");
      expect(types[types.length - 1]).toBe("run_completed");
    });

    it("emits run_failed when previous session not found", async () => {
      mockLoadSession.mockReturnValue(null);

      const result = await runtime.continueAnalysis(
        {
          sessionId: "new-session",
          previousSessionId: "non-existent",
          feedback: { acceptedCaseIds: [], rejectedCaseIds: [], unresolvedQuestions: [] },
        },
        (event) => collectedEvents.push(event),
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("无法加载上一轮会话");

      const failedEvent = collectedEvents.find((e) => e.type === "run_failed");
      expect(failedEvent).toBeDefined();
    });

    it("emits run_failed when extractResult fails", async () => {
      mockLoadSession.mockReturnValue(PREV_SESSION_DATA);
      mockExtractResult.mockReturnValue({
        success: false,
        error: { kind: "parse_error", message: "bad json", rawSnippet: "" },
      });

      const result = await runtime.continueAnalysis(
        {
          sessionId: "new-session",
          previousSessionId: "prev-session",
          feedback: { acceptedCaseIds: [], rejectedCaseIds: [], unresolvedQuestions: [] },
        },
        (event) => collectedEvents.push(event),
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("解析失败");

      const failedEvent = collectedEvents.find((e) => e.type === "run_failed");
      expect(failedEvent).toBeDefined();
    });

    it("emits run_failed when Claude API throws", async () => {
      mockLoadSession.mockReturnValue(PREV_SESSION_DATA);
      mockStartAnalysis.mockRejectedValue(new Error("API timeout"));

      const result = await runtime.continueAnalysis(
        {
          sessionId: "new-session",
          previousSessionId: "prev-session",
          feedback: { acceptedCaseIds: [], rejectedCaseIds: [], unresolvedQuestions: [] },
        },
        (event) => collectedEvents.push(event),
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("API timeout");
    });

    it("includes previousSessionId in metadata", async () => {
      mockLoadSession.mockReturnValue(PREV_SESSION_DATA);

      await runtime.continueAnalysis(
        {
          sessionId: "new-session",
          previousSessionId: "prev-session",
          feedback: { acceptedCaseIds: [], rejectedCaseIds: [], unresolvedQuestions: [] },
        },
        (event) => collectedEvents.push(event),
      );

      expect(mockWriteAll).toHaveBeenCalledTimes(1);
      const metadataArg = mockWriteAll.mock.calls[0][6] as { previousSessionId?: string };
      expect(metadataArg.previousSessionId).toBe("prev-session");
    });

    it("handles AbortSignal correctly", async () => {
      mockLoadSession.mockReturnValue(PREV_SESSION_DATA);
      const controller = new AbortController();
      controller.abort();

      const result = await runtime.continueAnalysis(
        {
          sessionId: "new-session",
          previousSessionId: "prev-session",
          feedback: { acceptedCaseIds: [], rejectedCaseIds: [], unresolvedQuestions: [] },
        },
        (event) => collectedEvents.push(event),
        { signal: controller.signal },
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("取消");
    });
  });

  describe("getModel", () => {
    it("returns the model from ClaudeRuntime config", () => {
      expect(runtime.getModel()).toBe("claude-sonnet-4-5");
    });
  });
});
