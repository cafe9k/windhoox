import "@testing-library/jest-dom/vitest";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AgentProgressBadge } from "./AgentProgressBadge";
import type { AgentEvent } from "../../../types/agent";

describe("AgentProgressBadge", () => {
  it("不渲染 idle 状态", () => {
    const { container } = render(
      <AgentProgressBadge status="idle" events={[]} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("渲染 running 状态", () => {
    const events: AgentEvent[] = [
      {
        type: "run_started",
        sessionId: "session-1",
        taskId: "task-1",
        timestamp: Date.now(),
      },
      {
        type: "reading_sources",
        sessionId: "session-1",
        source: "PRD.md",
        timestamp: Date.now(),
      },
    ];

    render(<AgentProgressBadge status="running" events={events} />);
    expect(screen.getByRole("button")).toBeInTheDocument();
    // Current stage is "analyzing" → maps to "requirement-insight" → "需求洞察"
    expect(screen.getByText(/需求洞察/)).toBeInTheDocument();
  });

  it("渲染 completed 状态", () => {
    const events: AgentEvent[] = [
      {
        type: "run_started",
        sessionId: "session-1",
        taskId: "task-1",
        timestamp: Date.now(),
      },
      {
        type: "reading_sources",
        sessionId: "session-1",
        source: "PRD.md",
        timestamp: Date.now(),
      },
      {
        type: "run_completed",
        sessionId: "session-1",
        artifactPaths: {
          conversationPath: "/tmp/conv",
          insightPath: "/tmp/insight",
          casesPath: "/tmp/cases",
          coveragePath: "/tmp/coverage",
        },
        timestamp: Date.now(),
      },
    ];

    render(<AgentProgressBadge status="completed" events={events} />);
    expect(screen.getByText(/分析完成/)).toBeInTheDocument();
  });

  it("点击后展开详细面板", async () => {
    const events: AgentEvent[] = [
      {
        type: "run_started",
        sessionId: "session-1",
        taskId: "task-1",
        timestamp: Date.now(),
      },
    ];

    render(<AgentProgressBadge status="running" events={events} />);

    const trigger = screen.getByRole("button");
    fireEvent.click(trigger);

    // Popover 内容应该出现
    expect(screen.getByText(/执行阶段/)).toBeInTheDocument();
    expect(screen.getByText(/事件日志/)).toBeInTheDocument();
  });

  it("显示进度点", () => {
    const events: AgentEvent[] = [
      {
        type: "run_started",
        sessionId: "session-1",
        taskId: "task-1",
        timestamp: Date.now(),
      },
      {
        type: "reading_sources",
        sessionId: "session-1",
        source: "PRD.md",
        timestamp: Date.now(),
      },
      {
        type: "requirement_insight",
        sessionId: "session-1",
        insight: {
          businessRule: "需要处理边界情况",
          risk: "高",
          evidence: "PRD 第3节",
          confidence: "high",
        },
        timestamp: Date.now(),
      },
    ];

    const { container } = render(
      <AgentProgressBadge status="running" events={events} />
    );

    // 应该有 4 个进度点（读取、洞察、用例、覆盖）
    const dots = container.querySelectorAll(".agent-progress-dot");
    expect(dots.length).toBe(4);

    // 前两个应该完成，第三个应该 current
    expect(dots[0].classList.contains("agent-progress-dot--done")).toBe(true);
    expect(dots[1].classList.contains("agent-progress-dot--done")).toBe(true);
    expect(dots[2].classList.contains("agent-progress-dot--current")).toBe(true);
  });
});
