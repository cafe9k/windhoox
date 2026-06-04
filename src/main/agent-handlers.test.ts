import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ipcMain, BrowserWindow } from "electron";
import { registerAgentHandlers } from "./agent-handlers.js";

const mockRunAnalysis = vi.fn().mockResolvedValue({
  sessionId: "mock-session-id",
  success: true,
  artifactPaths: {
    conversationPath: "/tmp/windhoox-test/session-123/conversation.md",
    insightPath: "/tmp/windhoox-test/session-123/insight.json",
    casesPath: "/tmp/windhoox-test/session-123/cases.json",
    coveragePath: "/tmp/windhoox-test/session-123/coverage.json",
  },
});

const mockContinueAnalysis = vi.fn().mockResolvedValue({
  sessionId: "mock-continue-session-id",
  success: true,
  artifactPaths: {
    conversationPath: "/tmp/windhoox-test/continue-session/conversation.md",
    insightPath: "/tmp/windhoox-test/continue-session/insight.json",
    casesPath: "/tmp/windhoox-test/continue-session/cases.json",
    coveragePath: "/tmp/windhoox-test/continue-session/coverage.json",
  },
});

const mockGetModel = vi.fn().mockReturnValue("claude-sonnet-4-5");

const mockLoadSession = vi.fn().mockReturnValue(null);
const mockListSessions = vi.fn().mockReturnValue([]);

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

// Mock createClaudeRuntimeFromConfig — returns an object with ClaudeRuntime interface
vi.mock("./claude/runtime/createClaudeRuntime.js", () => ({
  createClaudeRuntimeFromConfig: vi.fn(() => ({
    startAnalysis: vi.fn().mockResolvedValue({
      id: "msg_test",
      role: "assistant",
      content: [{ type: "text", text: "{}" }],
      usage: { input_tokens: 100, output_tokens: 50 },
    }),
    getConfig: vi.fn(() => ({ model: "claude-sonnet-4-5" })),
  })),
}));

// Mock ClaudeAgentRuntime — the key new dependency
vi.mock("./claude/ClaudeAgentRuntime.js", () => ({
  ClaudeAgentRuntime: vi.fn().mockImplementation(function () {
    this.runAnalysis = mockRunAnalysis;
    this.continueAnalysis = mockContinueAnalysis;
    this.getModel = mockGetModel;
  }),
}));

// Mock SessionStore
vi.mock("./storage/SessionStore.js", () => ({
  SessionStore: vi.fn().mockImplementation(function () {
    this.loadSession = mockLoadSession;
    this.listSessions = mockListSessions;
  }),
}));

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
    expect(handlers["agent:cancel-analysis"]).toBeDefined();
    expect(handlers["agent:review-case"]).toBeDefined();
    expect(handlers["agent:load-session"]).toBeDefined();
    expect(handlers["agent:list-sessions"]).toBeDefined();
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
    // UUID v4 format: 8-4-4-4-12 hex chars
    expect(result.sessionId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });

  it("agent:start-analysis delegates to ClaudeAgentRuntime.runAnalysis", async () => {
    const payload = {
      requirementText: "test requirement",
      contextReferences: ["file1.ts"],
    };

    const result = await handlers["agent:start-analysis"](null, payload);

    // Wait for async operations
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Should have called runAnalysis with correct input
    expect(mockRunAnalysis).toHaveBeenCalledTimes(1);
    expect(mockRunAnalysis).toHaveBeenCalledWith(
      expect.objectContaining({
        requirementText: "test requirement",
        contextReferences: ["file1.ts"],
      }),
      expect.any(Function), // onEvent callback
      expect.objectContaining({ signal: expect.any(AbortSignal) }), // options
    );

    // The onEvent callback should forward events to the renderer
    const onEvent = mockRunAnalysis.mock.calls[0][1] as (event: any) => void;
    const testEvent = { type: "run_started", sessionId: result.sessionId, timestamp: Date.now() };
    onEvent(testEvent);
    expect(mockMainWindow.webContents.send).toHaveBeenCalledWith("agent:event", testEvent);
  });

  it("registers agent:cancel-analysis handler", () => {
    expect(handlers["agent:cancel-analysis"]).toBeDefined();
  });

  it("agent:start-analysis sends run_failed when runtime is not available", async () => {
    // Temporarily make createClaudeRuntimeFromConfig return null
    const { createClaudeRuntimeFromConfig } = await import("./claude/runtime/createClaudeRuntime.js");
    vi.mocked(createClaudeRuntimeFromConfig).mockReturnValueOnce(null as any);

    const payload = { requirementText: "test" };
    await handlers["agent:start-analysis"](null, payload);

    // Should have sent a run_failed event
    const calls = mockMainWindow.webContents.send.mock.calls;
    const failedEvent = calls.find((c: any[]) => c[1]?.type === "run_failed");
    expect(failedEvent).toBeDefined();
    expect(failedEvent[1].error).toContain("未配置");
  });

  it("agent:continue-analysis delegates to ClaudeAgentRuntime.continueAnalysis", async () => {
    const payload = {
      previousSessionId: "prev-session",
      feedback: {
        acceptedCaseIds: ["TC-001"],
        rejectedCaseIds: [],
        unresolvedQuestions: [],
      },
    };

    const result = await handlers["agent:continue-analysis"](null, payload);

    // Should generate a new sessionId (UUID format)
    expect(result.sessionId).toBeDefined();
    expect(result.sessionId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);

    // Wait for async operations
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Should have called continueAnalysis
    expect(mockContinueAnalysis).toHaveBeenCalledTimes(1);
    expect(mockContinueAnalysis).toHaveBeenCalledWith(
      expect.objectContaining({
        previousSessionId: "prev-session",
        feedback: expect.objectContaining({
          acceptedCaseIds: ["TC-001"],
        }),
      }),
      expect.any(Function), // onEvent callback
      expect.objectContaining({ signal: expect.any(AbortSignal) }), // options
    );
  });

  it("agent:review-case returns success", async () => {
    const result = await handlers["agent:review-case"](null, {
      sessionId: "test",
      caseId: "TC-001",
      status: "accepted",
    });
    expect(result.success).toBe(true);
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

  it("agent:list-sessions returns session list from SessionStore", async () => {
    const mockSessions = [
      { id: "session-1", createdAt: 1700000000000, status: "completed", requirementText: "req 1", model: "claude-sonnet" },
      { id: "session-2", createdAt: 1700000001000, status: "failed", requirementText: "req 2", model: "claude-sonnet" },
    ];
    mockListSessions.mockReturnValueOnce(mockSessions);

    const result = await handlers["agent:list-sessions"](null);

    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("session-1");
    expect(result[1].status).toBe("failed");
  });

  it("agent:list-sessions returns empty array when no sessions", async () => {
    mockListSessions.mockReturnValueOnce([]);
    const result = await handlers["agent:list-sessions"](null);
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(0);
  });
});
