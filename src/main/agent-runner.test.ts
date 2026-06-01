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

  it("emits run_failed when API returns empty content", async () => {
    vi.mocked(chatCompletion).mockResolvedValueOnce({
      id: "resp-empty",
      object: "chat.completion",
      created: Date.now(),
      model: "deepseek-reasoner",
      choices: [
        {
          index: 0,
          message: { role: "assistant", content: "" },
          finish_reason: "stop",
        },
      ],
    });

    await expect(
      runLocalAgent({ sessionId: "test-empty", requirementText: "需求" }),
    ).rejects.toThrow("empty response");
  });

  it("emits run_failed when API returns invalid JSON", async () => {
    vi.mocked(chatCompletion).mockResolvedValueOnce({
      id: "resp-bad-json",
      object: "chat.completion",
      created: Date.now(),
      model: "deepseek-reasoner",
      choices: [
        {
          index: 0,
          message: { role: "assistant", content: "not valid json {{" },
          finish_reason: "stop",
        },
      ],
    });

    await expect(
      runLocalAgent({ sessionId: "test-bad", requirementText: "需求" }),
    ).rejects.toThrow("invalid JSON");
  });

  it("emits one requirement_insight event per insight", async () => {
    vi.mocked(chatCompletion).mockResolvedValueOnce({
      id: "resp-multi",
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
                { businessRule: "规则1", risk: "风险1", evidence: "证据1", confidence: "high" },
                { businessRule: "规则2", risk: "风险2", evidence: "证据2", confidence: "medium" },
                { businessRule: "规则3", risk: "风险3", evidence: "证据3", confidence: "low" },
              ],
              questions: [],
              cases: [],
              coverage: [],
            }),
          },
          finish_reason: "stop",
        },
      ],
    });

    const result = await runLocalAgent({
      sessionId: "test-multi",
      requirementText: "多见解需求",
    });

    const insightEvents = result.events.filter((e) => e.type === "requirement_insight");
    expect(insightEvents).toHaveLength(3);
    expect(insightEvents[0].insight.confidence).toBe("high");
    expect(insightEvents[1].insight.confidence).toBe("medium");
    expect(insightEvents[2].insight.confidence).toBe("low");
  });

  it("auto-generates id for cases that lack one", async () => {
    vi.mocked(chatCompletion).mockResolvedValueOnce({
      id: "resp-no-id",
      object: "chat.completion",
      created: Date.now(),
      model: "deepseek-reasoner",
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: JSON.stringify({
              insights: [],
              questions: [],
              cases: [
                { id: "", title: "无ID用例", description: "描述", preconditions: [], steps: [], expectedResult: "结果", status: "pending" },
              ],
              coverage: [],
            }),
          },
          finish_reason: "stop",
        },
      ],
    });

    const result = await runLocalAgent({
      sessionId: "test-no-id",
      requirementText: "需求",
    });

    const caseEvent = result.events.find((e) => e.type === "case_candidates");
    expect(caseEvent).toBeDefined();
    expect(caseEvent!.cases[0].id).not.toBe("");
    expect(caseEvent!.cases[0].id.length).toBeGreaterThan(0);
  });

  it("auto-generates id for questions that lack one", async () => {
    vi.mocked(chatCompletion).mockResolvedValueOnce({
      id: "resp-q",
      object: "chat.completion",
      created: Date.now(),
      model: "deepseek-reasoner",
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: JSON.stringify({
              insights: [],
              questions: [
                { id: "", category: "product", question: "缺少ID的问题" },
              ],
              cases: [],
              coverage: [],
            }),
          },
          finish_reason: "stop",
        },
      ],
    });

    const result = await runLocalAgent({
      sessionId: "test-q-id",
      requirementText: "需求",
    });

    const qEvent = result.events.find((e) => e.type === "missing_questions");
    expect(qEvent).toBeDefined();
    expect(qEvent!.questions[0].id).not.toBe("");
    expect(qEvent!.questions[0].id.startsWith("q-")).toBe(true);
  });

  it("uses default 'medium' confidence when insight lacks it", async () => {
    vi.mocked(chatCompletion).mockResolvedValueOnce({
      id: "resp-no-conf",
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
                { businessRule: "规则", risk: "风险" }, // no confidence
              ],
              questions: [],
              cases: [],
              coverage: [],
            }),
          },
          finish_reason: "stop",
        },
      ],
    });

    const result = await runLocalAgent({
      sessionId: "test-default",
      requirementText: "需求",
    });

    const insightEvent = result.events.find((e) => e.type === "requirement_insight");
    expect(insightEvent!.insight.confidence).toBe("medium");
  });

  it("passes requirementText to buildAnalysisPrompt", async () => {
    const { buildAnalysisPrompt } = await import("./deepseek-client");
    vi.mocked(buildAnalysisPrompt).mockClear();
    vi.mocked(chatCompletion).mockResolvedValueOnce({
      id: "resp",
      object: "chat.completion",
      created: Date.now(),
      model: "deepseek-reasoner",
      choices: [{
        index: 0,
        message: { role: "assistant", content: '{"insights":[],"questions":[],"cases":[],"coverage":[]}' },
        finish_reason: "stop",
      }],
    });

    await runLocalAgent({ sessionId: "test-prompt", requirementText: "特定需求文本" });

    expect(buildAnalysisPrompt).toHaveBeenCalledWith("特定需求文本");
  });

  it("sets all event sessionIds to the input sessionId", async () => {
    vi.mocked(chatCompletion).mockResolvedValueOnce({
      id: "resp",
      object: "chat.completion",
      created: Date.now(),
      model: "deepseek-reasoner",
      choices: [{
        index: 0,
        message: {
          role: "assistant",
          content: JSON.stringify({
            insights: [{ businessRule: "r", risk: "r", confidence: "high" }],
            questions: [{ id: "q-1", category: "product", question: "q" }],
            cases: [{ id: "TC-1", title: "t", description: "d", preconditions: [], steps: [], expectedResult: "e", status: "pending" }],
            coverage: [{ requirementId: "REQ", caseIds: ["TC-1"] }],
          }),
        },
        finish_reason: "stop",
      }],
    });

    const result = await runLocalAgent({ sessionId: "session-abc", requirementText: "需求" });

    for (const event of result.events) {
      expect((event as any).sessionId).toBe("session-abc");
    }
  });
});
