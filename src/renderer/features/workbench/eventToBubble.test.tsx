import { describe, it, expect } from "vitest";
import { eventToBubble, createUserBubble, createLoadingBubble } from "./eventToBubble";
import type { AgentEvent } from "../../../types/agent";

describe("eventToBubble", () => {
  it("maps run_started event to bubble", () => {
    const event: AgentEvent = {
      type: "run_started",
      sessionId: "test-123",
      taskId: "task-1",
      timestamp: Date.now(),
    };

    const bubble = eventToBubble(event);

    expect(bubble).not.toBeNull();
    expect(bubble!.content).toContain("开始分析");
    expect(bubble!.role).toBe("assistant");
    expect(bubble!.placement).toBe("left");
  });

  it("maps reading_sources event to bubble", () => {
    const event: AgentEvent = {
      type: "reading_sources",
      sessionId: "test-123",
      source: "src/services/PaymentService.ts",
      timestamp: Date.now(),
    };

    const bubble = eventToBubble(event);

    expect(bubble).not.toBeNull();
    expect(bubble!.content).toContain("PaymentService.ts");
    expect(bubble!.role).toBe("assistant");
  });

  it("maps requirement_insight event to bubble", () => {
    const event: AgentEvent = {
      type: "requirement_insight",
      sessionId: "test-123",
      insight: {
        businessRule: "支付必须幂等",
        risk: "重复扣款风险",
        evidence: "PaymentService 第 78 行",
        confidence: "high",
      },
      timestamp: Date.now(),
    };

    const bubble = eventToBubble(event);

    expect(bubble).not.toBeNull();
    expect(bubble!.content).toContain("支付必须幂等");
    expect(bubble!.content).toContain("重复扣款风险");
    expect(bubble!.content).toContain("high");
  });

  it("maps missing_questions event to bubble", () => {
    const event: AgentEvent = {
      type: "missing_questions",
      sessionId: "test-123",
      questions: [
        {
          id: "q-1",
          category: "product",
          question: "支付超时时间是多少？",
        },
        {
          id: "q-2",
          category: "engineering",
          question: "是否需要分布式锁？",
        },
      ],
      timestamp: Date.now(),
    };

    const bubble = eventToBubble(event);

    expect(bubble).not.toBeNull();
    expect(bubble!.content).toContain("2 个待确认问题");
    expect(bubble!.content).toContain("支付超时时间");
    expect(bubble!.content).toContain("分布式锁");
  });

  it("maps case_candidates event to bubble", () => {
    const event: AgentEvent = {
      type: "case_candidates",
      sessionId: "test-123",
      cases: [
        {
          id: "tc-1",
          title: "正常支付流程",
          description: "验证正常支付",
          preconditions: [],
          steps: [],
          expectedResult: "支付成功",
          status: "pending",
        },
      ],
      timestamp: Date.now(),
    };

    const bubble = eventToBubble(event);

    expect(bubble).not.toBeNull();
    expect(bubble!.content).toContain("1 条候选测试用例");
  });

  it("maps coverage_matrix event to bubble", () => {
    const event: AgentEvent = {
      type: "coverage_matrix",
      sessionId: "test-123",
      matrix: [
        {
          requirementId: "REQ-01",
          caseIds: ["tc-1", "tc-2"],
        },
      ],
      timestamp: Date.now(),
    };

    const bubble = eventToBubble(event);

    expect(bubble).not.toBeNull();
    expect(bubble!.content).toContain("1 个需求点");
  });

  it("maps run_completed event to bubble", () => {
    const event: AgentEvent = {
      type: "run_completed",
      sessionId: "test-123",
      artifactPaths: {
        conversationPath: "/tmp/conv.md",
        insightPath: "/tmp/insight.json",
        casesPath: "/tmp/cases.json",
        coveragePath: "/tmp/coverage.json",
      },
      timestamp: Date.now(),
    };

    const bubble = eventToBubble(event);

    expect(bubble).not.toBeNull();
    expect(bubble!.content).toContain("分析完成");
  });

  it("maps run_failed event to bubble", () => {
    const event: AgentEvent = {
      type: "run_failed",
      sessionId: "test-123",
      error: "API Key 无效",
      recoverable: true,
      retryEligible: false,
      timestamp: Date.now(),
    };

    const bubble = eventToBubble(event);

    expect(bubble).not.toBeNull();
    expect(bubble!.content).toContain("分析失败");
    expect(bubble!.content).toContain("API Key 无效");
  });

  it("maps run_continued event to bubble", () => {
    const event: AgentEvent = {
      type: "run_continued",
      sessionId: "new-session",
      previousSessionId: "prev-session",
      timestamp: Date.now(),
    };

    const bubble = eventToBubble(event);

    expect(bubble).not.toBeNull();
    expect(bubble!.content).toContain("继续分析");
    expect(bubble!.content).toContain("prev-ses");
    expect(bubble!.role).toBe("assistant");
  });

  it("returns null for case_reviewed event", () => {
    const event: AgentEvent = {
      type: "case_reviewed",
      sessionId: "test-123",
      caseId: "tc-1",
      status: "accepted",
      timestamp: Date.now(),
    };

    const bubble = eventToBubble(event);

    expect(bubble).toBeNull();
  });
});

describe("createUserBubble", () => {
  it("creates user bubble with requirement", () => {
    const bubble = createUserBubble("用户支付流程", "session-123");

    expect(bubble.content).toBe("用户支付流程");
    expect(bubble.role).toBe("user");
    expect(bubble.placement).toBe("right");
    expect(bubble.key).toBe("user-session-123");
  });
});

describe("createLoadingBubble", () => {
  it("creates loading bubble", () => {
    const bubble = createLoadingBubble();

    expect(bubble.loading).toBe(true);
    expect(bubble.role).toBe("assistant");
    expect(bubble.placement).toBe("left");
  });
});
