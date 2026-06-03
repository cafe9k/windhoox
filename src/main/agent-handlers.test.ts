import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ipcMain, BrowserWindow } from "electron";
import { registerAgentHandlers } from "./agent-handlers.js";

const mockWriteAll = vi.fn().mockReturnValue({
  conversationPath: "/tmp/windhoox-test/session-123/conversation.md",
  insightPath: "/tmp/windhoox-test/session-123/insight.json",
  casesPath: "/tmp/windhoox-test/session-123/cases.json",
  coveragePath: "/tmp/windhoox-test/session-123/coverage.json",
  validationPath: "/tmp/windhoox-test/session-123/validation.json",
  eventsPath: "/tmp/windhoox-test/session-123/events.json",
  metadataPath: "/tmp/windhoox-test/session-123/metadata.json",
});

const mockLoadSession = vi.fn().mockReturnValue(null);

// Mock electron
vi.mock("electron", () => ({
  ipcMain: {
    handle: vi.fn(),
  },
  BrowserWindow: vi.fn(),
  app: {
    getPath: vi.fn(() => "/tmp/windhoox-test"),
  },
}));

// Mock config
vi.mock("./config.js", () => ({
  getConfig: vi.fn(() => ({
    anthropicApiKey: "test-key",
    model: "claude-sonnet-4-5",
    systemPrompt: "test prompt",
    maxTokens: 4096,
    temperature: 0.7,
  })),
  setConfig: vi.fn((updates) => updates),
  getConfigMasked: vi.fn(() => ({
    anthropicApiKey: "****",
    model: "claude-sonnet-4-5",
  })),
  isConfigReady: vi.fn(() => true),
}));

// Mock Claude runtime
const mockStartAnalysis = vi.fn().mockResolvedValue({
  id: "msg_test",
  role: "assistant",
  content: [
    {
      type: "text",
      text: JSON.stringify({
        pageUnderstanding: {
          pageType: "form",
          confidence: 0.9,
          modules: [],
          risks: [],
        },
        insights: [
          {
            businessRule: "test rule",
            risk: "test risk",
            evidence: "test evidence",
            confidence: "high",
          },
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
      }),
    },
  ],
  model: "claude-sonnet-4-5",
  stop_reason: "end_turn",
  usage: { input_tokens: 100, output_tokens: 50 },
});

vi.mock("./claude/runtime/createClaudeRuntime.js", () => ({
  createClaudeRuntimeFromConfig: vi.fn(() => ({
    startAnalysis: mockStartAnalysis,
    getConfig: vi.fn(() => ({ model: "claude-sonnet-4-5" })),
  })),
}));

// Mock extractResult and event adapters
vi.mock("./claude/runtime/ClaudeResultExtractor.js", () => ({
  extractResult: vi.fn((text) => ({
    success: true,
    data: JSON.parse(text),
  })),
}));

vi.mock("./claude/runtime/ClaudeEventAdapter.js", () => ({
  createRunStartedEvent: vi.fn((sessionId, timestamp) => ({
    type: "run_started",
    sessionId,
    taskId: `task-${sessionId}`,
    timestamp,
  })),
  createReadingSourceEvents: vi.fn((sessionId, sources, timestamp) =>
    sources.map((source, i) => ({
      type: "reading_sources",
      sessionId,
      source,
      timestamp: timestamp + i,
    }))
  ),
  resultToAgentEvents: vi.fn((data, sessionId) => [
    {
      type: "requirement_insight",
      sessionId,
      insight: data.insights[0],
      timestamp: Date.now(),
    },
    {
      type: "missing_questions",
      sessionId,
      questions: data.questions,
      timestamp: Date.now() + 1,
    },
    {
      type: "case_candidates",
      sessionId,
      cases: data.cases,
      timestamp: Date.now() + 2,
    },
    {
      type: "coverage_matrix",
      sessionId,
      matrix: data.coverage,
      timestamp: Date.now() + 3,
    },
  ]),
}));

// Mock storage
vi.mock("./storage/ArtifactWriter.js", () => {
  return {
    ArtifactWriter: class {
      writeAll = mockWriteAll;
    },
  };
});

vi.mock("./storage/SessionStore.js", () => {
  return {
    SessionStore: class {
      loadSession = mockLoadSession;
    },
  };
});

describe("agent-handlers", () => {
  let mockMainWindow: any;
  let handlers: Record<string, Function>;

  beforeEach(() => {
    vi.clearAllMocks();
    handlers = {};

    mockMainWindow = {
      webContents: {
        send: vi.fn(),
      },
    };

    // Capture registered handlers
    vi.mocked(ipcMain.handle).mockImplementation((channel, handler) => {
      handlers[channel] = handler;
    });

    // Register handlers
    registerAgentHandlers(mockMainWindow);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("registers all expected IPC handlers", () => {
    expect(handlers["agent:start-analysis"]).toBeDefined();
    expect(handlers["agent:continue-analysis"]).toBeDefined();
    expect(handlers["agent:review-case"]).toBeDefined();
    expect(handlers["agent:load-session"]).toBeDefined();
    expect(handlers["agent:get-config"]).toBeDefined();
    expect(handlers["agent:set-config"]).toBeDefined();
  });

  it("agent:start-analysis returns sessionId immediately", async () => {
    const payload = {
      requirementText: "test requirement",
      contextReferences: [],
    };

    const result = await handlers["agent:start-analysis"](null, payload);

    expect(result.sessionId).toBeDefined();
    expect(result.sessionId).toMatch(/^session-/);
  });

  it("agent:start-analysis sends events to renderer", async () => {
    const payload = {
      requirementText: "test requirement",
      contextReferences: [],
    };

    await handlers["agent:start-analysis"](null, payload);

    // Wait for async operations to complete
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Should have sent multiple events
    expect(mockMainWindow.webContents.send).toHaveBeenCalled();
    const calls = mockMainWindow.webContents.send.mock.calls;
    expect(calls.length).toBeGreaterThan(0);

    // First call should be run_started
    expect(calls[0][0]).toBe("agent:event");
    expect(calls[0][1].type).toBe("run_started");
  });

  it("agent:start-analysis writes artifacts and sends run_completed", async () => {
    const payload = {
      requirementText: "test requirement",
    };

    await handlers["agent:start-analysis"](null, payload);

    // Wait for async operations
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Should have written artifacts
    expect(mockWriteAll).toHaveBeenCalledTimes(1);

    // Last event should be run_completed with real paths
    const calls = mockMainWindow.webContents.send.mock.calls;
    const lastCall = calls[calls.length - 1];
    expect(lastCall[0]).toBe("agent:event");
    expect(lastCall[1].type).toBe("run_completed");
    expect(lastCall[1].artifactPaths.conversationPath).toContain("conversation.md");
  });

  it("agent:continue-analysis returns not supported", async () => {
    const result = await handlers["agent:continue-analysis"](null, {});
    expect(result.success).toBe(false);
    expect(result.reason).toContain("尚未支持");
  });

  it("agent:load-session returns error when session not found", async () => {
    mockLoadSession.mockReturnValueOnce(null);
    const result = await handlers["agent:load-session"](null, { sessionId: "non-existent" });
    expect(result.success).toBe(false);
    expect(result.reason).toContain("not found");
  });

  it("agent:load-session returns session data when found", async () => {
    const mockSession = {
      metadata: { id: "session-123", createdAt: Date.now(), status: "completed" },
      events: [{ type: "run_started", sessionId: "session-123", timestamp: Date.now() }],
      paths: {
        conversationPath: "/tmp/test/conversation.md",
        insightPath: "/tmp/test/insight.json",
        casesPath: "/tmp/test/cases.json",
        coveragePath: "/tmp/test/coverage.json",
        validationPath: "/tmp/test/validation.json",
        eventsPath: "/tmp/test/events.json",
        metadataPath: "/tmp/test/metadata.json",
      },
    };
    mockLoadSession.mockReturnValueOnce(mockSession);

    const result = await handlers["agent:load-session"](null, { sessionId: "session-123" });
    expect(result.success).toBe(true);
    expect(result.sessionId).toBe("session-123");
    expect(result.events).toHaveLength(1);
    expect(result.paths).toBeDefined();
  });

  it("agent:get-config returns masked config", async () => {
    const result = await handlers["agent:get-config"]();
    expect(result.anthropicApiKey).toBe("****");
  });

  it("agent:set-config updates config", async () => {
    const updates = { model: "claude-opus-4" };
    const result = await handlers["agent:set-config"](null, updates);
    expect(result.model).toBe("claude-opus-4");
  });
});
