import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ClaudeRuntimeConfig } from "./types.js";

// Mock Anthropic SDK with a proper class inside vi.mock
vi.mock("@anthropic-ai/sdk", () => {
  class MockAnthropic {
    messages = {
      create: vi.fn().mockResolvedValue({
        id: "msg_test_123",
        content: [{ type: "text", text: "Test response" }],
        role: "assistant",
        model: "claude-sonnet-4-5",
        stop_reason: "end_turn",
        stop_sequence: null,
        type: "message",
        usage: {
          input_tokens: 100,
          output_tokens: 50,
        },
      }),
    };

    constructor(_config: { apiKey: string }) {
      // Mock constructor
    }
  }

  return {
    default: MockAnthropic,
  };
});

// Import after mock is set up
import { ClaudeRuntime } from "./ClaudeRuntime.js";

describe("ClaudeRuntime", () => {
  let runtime: ClaudeRuntime;
  let config: ClaudeRuntimeConfig;

  beforeEach(() => {
    vi.clearAllMocks();

    config = {
      apiKey: "test-api-key",
      model: "claude-sonnet-4-5",
      systemPrompt: "You are a test assistant.",
      maxTokens: 4096,
      temperature: 0.7,
    };

    runtime = new ClaudeRuntime(config);
  });

  it("should create runtime instance with config", () => {
    expect(runtime).toBeInstanceOf(ClaudeRuntime);
    expect(runtime.getConfig()).toEqual(config);
  });

  it("should start analysis and return message", async () => {
    const input = {
      requirementText: "Test requirement",
      sessionId: "test-session-123",
    };

    const message = await runtime.startAnalysis(input);

    expect(message).toBeDefined();
    expect(message.role).toBe("assistant");
    expect(message.content).toHaveLength(1);
    expect(message.content[0].type).toBe("text");
  });

  it("should track session metadata", async () => {
    const input = {
      requirementText: "Test requirement",
      sessionId: "test-session-456",
    };

    await runtime.startAnalysis(input);

    const session = runtime.getCurrentSession();
    expect(session).toBeDefined();
    expect(session!.metadata.sessionId).toBe("test-session-456");
    expect(session!.metadata.status).toBe("completed");
    expect(session!.metadata.totalTokens).toBe(150); // 100 input + 50 output
  });

  it("should invoke callbacks during analysis", async () => {
    const onMessage = vi.fn();
    const onAssistantMessage = vi.fn();
    const onComplete = vi.fn();

    const input = {
      requirementText: "Test requirement",
      sessionId: "test-session-789",
    };

    await runtime.startAnalysis(input, {
      onMessage,
      onAssistantMessage,
      onComplete,
    });

    expect(onMessage).toHaveBeenCalledTimes(1);
    expect(onAssistantMessage).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("should continue conversation with message history", async () => {
    const input = {
      requirementText: "Initial requirement",
      sessionId: "test-session-continue",
    };

    await runtime.startAnalysis(input);
    await runtime.continueConversation("Follow-up question");

    const session = runtime.getCurrentSession();
    expect(session!.messages).toHaveLength(2);
    expect(session!.assistantMessages).toHaveLength(2);
  });

  it("should throw error when continuing without active session", async () => {
    await expect(runtime.continueConversation("Question")).rejects.toThrow(
      "No active session",
    );
  });

  it("should reset session", async () => {
    const input = {
      requirementText: "Test requirement",
      sessionId: "test-session-reset",
    };

    await runtime.startAnalysis(input);
    expect(runtime.getCurrentSession()).toBeDefined();

    runtime.resetSession();
    expect(runtime.getCurrentSession()).toBeNull();
  });

  it("should update config", () => {
    const newConfig = {
      model: "claude-opus-4",
      maxTokens: 8192,
    };

    runtime.updateConfig(newConfig);

    const updatedConfig = runtime.getConfig();
    expect(updatedConfig.model).toBe("claude-opus-4");
    expect(updatedConfig.maxTokens).toBe(8192);
    expect(updatedConfig.temperature).toBe(0.7); // unchanged
  });
});
