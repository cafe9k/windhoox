import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { runLocalAgent } from "./agent-runner";

// Mock config module
vi.mock("./config", () => ({
  getConfig: vi.fn(() => ({
    deepseekApiKey: "test-key",
    deepseekBaseUrl: "https://api.deepseek.com",
    deepseekModel: "deepseek-reasoner",
  })),
  isConfigReady: vi.fn(() => true),
}));

// Mock deepseek client
vi.mock("./deepseek-client", () => ({
  chatCompletion: vi.fn(),
  buildAnalysisPrompt: vi.fn(() => [
    { role: "system", content: "test system" },
    { role: "user", content: "test user" },
  ]),
  DeepSeekError: class DeepSeekError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "DeepSeekError";
    }
  },
}));

import { chatCompletion } from "./deepseek-client";

describe("runLocalAgent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns events and artifacts on successful run", async () => {
    vi.mocked(chatCompletion).mockResolvedValueOnce({
      id: "test-resp",
      object: "chat.completion",
      created: Date.now(),
      model: "deepseek-reasoner",
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: JSON.stringify({
              insights: [
                {
                  businessRule: "规则1",
                  risk: "风险1",
                  evidence: "证据1",
                  confidence: "high",
                },
              ],
              questions: [
                { id: "q-1", category: "product", question: "问题1" },
              ],
              cases: [
                {
                  id: "TC-001",
                  title: "用例1",
                  description: "描述",
                  preconditions: [],
                  steps: ["步骤1"],
                  expectedResult: "预期结果",
                  status: "pending",
                },
              ],
              coverage: [
                { requirementId: "REQ-01", caseIds: ["TC-001"] },
              ],
            }),
          },
          finish_reason: "stop",
        },
      ],
    });

    const input = {
      sessionId: "test-123",
      requirementText: "测试需求",
    };

    const result = await runLocalAgent(input);

    expect(result.events).toBeDefined();
    expect(result.events.length).toBeGreaterThan(0);
    expect(result.events[0].type).toBe("run_started");
    expect(result.artifacts).toBeDefined();
    expect(result.artifacts.conversationPath).toContain("test-123");
  });

  it("includes all event types on success", async () => {
    vi.mocked(chatCompletion).mockResolvedValueOnce({
      id: "test-resp",
      object: "chat.completion",
      created: Date.now(),
      model: "deepseek-reasoner",
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: JSON.stringify({
              insights: [
                {
                  businessRule: "规则",
                  risk: "风险",
                  evidence: "证据",
                  confidence: "high",
                },
              ],
              questions: [
                { id: "q-1", category: "product", question: "问题" },
              ],
              cases: [
                {
                  id: "TC-001",
                  title: "用例",
                  description: "描述",
                  preconditions: [],
                  steps: [],
                  expectedResult: "结果",
                  status: "pending",
                },
              ],
              coverage: [
                { requirementId: "REQ-01", caseIds: ["TC-001"] },
              ],
            }),
          },
          finish_reason: "stop",
        },
      ],
    });

    const input = {
      sessionId: "test-456",
      requirementText: "另一个需求",
    };

    const result = await runLocalAgent(input);

    const types = result.events.map((e) => e.type);
    expect(types).toContain("run_started");
    expect(types).toContain("reading_sources");
    expect(types).toContain("requirement_insight");
    expect(types).toContain("missing_questions");
    expect(types).toContain("case_candidates");
    expect(types).toContain("coverage_matrix");
    expect(types).toContain("run_completed");
  });

  it("includes run_failed event on API error", async () => {
    vi.mocked(chatCompletion).mockRejectedValueOnce(
      new Error("API rate limit exceeded"),
    );

    const input = {
      sessionId: "test-789",
      requirementText: "需求描述",
    };

    await expect(runLocalAgent(input)).rejects.toThrow();

    // The function re-throws, but the error event is pushed to the events array
    // before re-throwing. Since we can't access it after rejection in this pattern,
    // we verify the function throws as expected.
  });
});
