import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LeftRail } from "./LeftRail";

describe("LeftRail", () => {
  it("renders primary action items", () => {
    render(<LeftRail />);
    expect(screen.getByLabelText("新对话")).toBeInTheDocument();
    expect(screen.getByLabelText("搜索")).toBeInTheDocument();
    expect(screen.getByLabelText("设置")).toBeInTheDocument();
  });

  it("renders empty state when no sessions", () => {
    render(<LeftRail sessions={[]} />);
    expect(screen.getByText("还没有分析记录")).toBeInTheDocument();
  });

  it("renders session items", () => {
    const sessions = [
      { id: "s1", title: "支付流程分析", meta: "1 小时" },
      { id: "s2", title: "登录边界测试", meta: "17 小时" },
    ];
    render(<LeftRail sessions={sessions} />);
    expect(screen.getByText("支付流程分析")).toBeInTheDocument();
    expect(screen.getByText("1 小时")).toBeInTheDocument();
  });

  it("renders active session with active class", () => {
    const sessions = [{ id: "s1", title: "置顶会话", active: true }];
    render(<LeftRail sessions={sessions} />);
    expect(screen.getByText("置顶")).toBeInTheDocument();
    expect(screen.getByLabelText("置顶会话").className).toContain("active");
  });

  it("calls onNewSession when new action is clicked", () => {
    const onNew = vi.fn();
    render(<LeftRail onNewSession={onNew} />);
    fireEvent.click(screen.getByLabelText("新对话"));
    expect(onNew).toHaveBeenCalledTimes(1);
  });

  it("calls onSelectSession with correct id", () => {
    const onSelect = vi.fn();
    const sessions = [{ id: "s1", title: "测试会话" }];
    render(<LeftRail sessions={sessions} onSelectSession={onSelect} />);
    fireEvent.click(screen.getByLabelText("测试会话"));
    expect(onSelect).toHaveBeenCalledWith("s1");
  });

  it("calls onOpenSettings when settings is clicked", () => {
    const onSettings = vi.fn();
    render(<LeftRail onOpenSettings={onSettings} />);
    fireEvent.click(screen.getByLabelText("设置"));
    expect(onSettings).toHaveBeenCalledTimes(1);
  });
});
