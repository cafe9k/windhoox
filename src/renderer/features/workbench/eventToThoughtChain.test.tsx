import { describe, it, expect } from "vitest";
import {
  eventsToThoughtChain,
  createInitialThoughtChain,
  createRunningThoughtChain,
} from "./eventToThoughtChain";
import type { AgentEvent } from "../../../types/agent";

describe("eventsToThoughtChain", () => {
  it("returns empty array for no events", () => {
    const stages = eventsToThoughtChain([]);
    expect(stages).toEqual([]);
  });

  it("maps reading_sources to reading stage", () => {
    const events: AgentEvent[] = [
      {
        type: "reading_sources",
        sessionId: "test-123",
        source: "src/services/PaymentService.ts",
        timestamp: Date.now(),
      },
      {
        type: "reading_sources",
        sessionId: "test-123",
        source: "src/services/OrderService.ts",
        timestamp: Date.now(),
      },
    ];

    const stages = eventsToThoughtChain(events);

    expect(stages).toHaveLength(2); // reading + analyzing (loading)
    expect(stages[0].key).toBe("reading-sources");
    expect(stages[0].status).toBe("success");
    expect(stages[0].description).toContain("2 个文件");
  });

  it("maps requirement_insight to insight stage", () => {
    const events: AgentEvent[] = [
      {
        type: "requirement_insight",
        sessionId: "test-123",
        insight: {
          businessRule: "支付必须幂等",
          confidence: "high",
        },
        timestamp: Date.now(),
      },
      {
        type: "requirement_insight",
        sessionId: "test-123",
        insight: {
          businessRule: "需要短信验证",
          confidence: "medium",
        },
        timestamp: Date.now(),
      },
    ];

    const stages = eventsToThoughtChain(events);

    expect(stages).toHaveLength(2); // insight + generating (loading)
    expect(stages[0].key).toBe("requirement-insight");
    expect(stages[0].status).toBe("success");
    expect(stages[0].description).toContain("2 个业务规则");
  });

  it("maps case_candidates to generate stage", () => {
    const events: AgentEvent[] = [
      {
        type: "case_candidates",
        sessionId: "test-123",
        cases: [
          {
            id: "tc-1",
            title: "正常支付",
            description: "测试",
            preconditions: [],
            steps: [],
            expectedResult: "成功",
            status: "pending",
          },
          {
            id: "tc-2",
            title: "支付失败",
            description: "测试",
            preconditions: [],
            steps: [],
            expectedResult: "失败",
            status: "pending",
          },
        ],
        timestamp: Date.now(),
      },
    ];

    const stages = eventsToThoughtChain(events);

    expect(stages).toHaveLength(1);
    expect(stages[0].key).toBe("generate-cases");
    expect(stages[0].status).toBe("success");
    expect(stages[0].description).toContain("2 条候选用例");
  });

  it("maps coverage_matrix to coverage stage", () => {
    const events: AgentEvent[] = [
      {
        type: "coverage_matrix",
        sessionId: "test-123",
        matrix: [
          { requirementId: "REQ-01", caseIds: ["tc-1"] },
          { requirementId: "REQ-02", caseIds: ["tc-2"] },
        ],
        timestamp: Date.now(),
      },
    ];

    const stages = eventsToThoughtChain(events);

    expect(stages).toHaveLength(1);
    expect(stages[0].key).toBe("coverage-analysis");
    expect(stages[0].status).toBe("success");
    expect(stages[0].description).toContain("2 个需求点");
  });

  it("maps run_completed to completed stage", () => {
    const events: AgentEvent[] = [
      {
        type: "run_completed",
        sessionId: "test-123",
        artifactPaths: {
          conversationPath: "/tmp/conv.md",
          insightPath: "/tmp/insight.json",
          casesPath: "/tmp/cases.json",
          coveragePath: "/tmp/coverage.json",
        },
        timestamp: Date.now(),
      },
    ];

    const stages = eventsToThoughtChain(events);

    expect(stages).toHaveLength(1);
    expect(stages[0].key).toBe("completed");
    expect(stages[0].status).toBe("success");
  });

  it("maps run_failed to failed stage", () => {
    const events: AgentEvent[] = [
      {
        type: "run_failed",
        sessionId: "test-123",
        error: "API Key 无效",
        recoverable: true,
        retryEligible: false,
        timestamp: Date.now(),
      },
    ];

    const stages = eventsToThoughtChain(events);

    expect(stages).toHaveLength(1);
    expect(stages[0].key).toBe("failed");
    expect(stages[0].status).toBe("error");
    expect(stages[0].description).toContain("API Key 无效");
  });

  it("builds full timeline for complete run", () => {
    const events: AgentEvent[] = [
      {
        type: "reading_sources",
        sessionId: "test-123",
        source: "file1.ts",
        timestamp: Date.now(),
      },
      {
        type: "requirement_insight",
        sessionId: "test-123",
        insight: { businessRule: "Rule 1", confidence: "high" },
        timestamp: Date.now(),
      },
      {
        type: "case_candidates",
        sessionId: "test-123",
        cases: [
          {
            id: "tc-1",
            title: "Test",
            description: "Test",
            preconditions: [],
            steps: [],
            expectedResult: "Pass",
            status: "pending",
          },
        ],
        timestamp: Date.now(),
      },
      {
        type: "coverage_matrix",
        sessionId: "test-123",
        matrix: [{ requirementId: "REQ-01", caseIds: ["tc-1"] }],
        timestamp: Date.now(),
      },
      {
        type: "run_completed",
        sessionId: "test-123",
        artifactPaths: {
          conversationPath: "/tmp/conv.md",
          insightPath: "/tmp/insight.json",
          casesPath: "/tmp/cases.json",
          coveragePath: "/tmp/coverage.json",
        },
        timestamp: Date.now(),
      },
    ];

    const stages = eventsToThoughtChain(events);

    expect(stages).toHaveLength(5);
    expect(stages.map((s) => s.key)).toEqual([
      "reading-sources",
      "requirement-insight",
      "generate-cases",
      "coverage-analysis",
      "completed",
    ]);
    expect(stages.every((s) => s.status === "success")).toBe(true);
  });
});

describe("createInitialThoughtChain", () => {
  it("creates 4 stages with loading/abort status", () => {
    const stages = createInitialThoughtChain();

    expect(stages).toHaveLength(4);
    expect(stages[0].status).toBe("loading");
    expect(stages[1].status).toBe("loading");
    expect(stages[2].status).toBe("abort");
    expect(stages[3].status).toBe("abort");
    expect(stages.map((s) => s.key)).toEqual([
      "reading-sources",
      "requirement-insight",
      "generate-cases",
      "coverage-analysis",
    ]);
  });
});

describe("createRunningThoughtChain", () => {
  it("marks current stage as loading and previous as success", () => {
    const stages = createRunningThoughtChain("generate-cases");

    expect(stages).toHaveLength(4);
    expect(stages[0].status).toBe("success"); // reading-sources
    expect(stages[1].status).toBe("success"); // requirement-insight
    expect(stages[2].status).toBe("loading"); // generate-cases
    expect(stages[3].status).toBe("abort"); // coverage-analysis
  });

  it("handles first stage", () => {
    const stages = createRunningThoughtChain("reading-sources");

    expect(stages[0].status).toBe("loading");
    expect(stages[1].status).toBe("loading");
    expect(stages[2].status).toBe("abort");
    expect(stages[3].status).toBe("abort");
  });
});
