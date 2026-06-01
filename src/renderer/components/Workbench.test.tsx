import "@testing-library/jest-dom/vitest";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Workbench } from "./Workbench";

describe("Workbench", () => {
  beforeEach(() => {
    const mockAgent = {
      startAnalysis: vi.fn().mockResolvedValue({ sessionId: "test-123" }),
      continueAnalysis: vi.fn().mockResolvedValue({ success: true }),
      reviewCase: vi.fn().mockResolvedValue({ success: true }),
      loadSession: vi.fn().mockResolvedValue({ success: true }),
      onEvent: vi.fn()
    };

    (window as any).windhoox = {
      appName: "Windhoox",
      platform: "darwin",
      agent: mockAgent
    };
  });

  it("renders the workbench layout with three panels", () => {
    render(<Workbench />);

    expect(screen.getByText("任务与上下文")).toBeInTheDocument();
    expect(screen.getByText("代理分析")).toBeInTheDocument();
    expect(screen.getByText("测试用例池")).toBeInTheDocument();
  });

  it("shows empty state when no session exists", () => {
    render(<Workbench />);

    expect(screen.getByText("创建任务开始分析")).toBeInTheDocument();
    expect(screen.getByText("未生成测试用例")).toBeInTheDocument();
  });

  it("shows task input form when no session exists", () => {
    render(<Workbench />);

    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("calls agent API when form is submitted", async () => {
    render(<Workbench />);

    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    const button = screen.getByRole("button", { name: /开始分析/ });

    fireEvent.change(textarea, { target: { value: "test requirement" } });
    fireEvent.click(button);

    await waitFor(() => {
      expect((window as any).windhoox.agent.startAnalysis).toHaveBeenCalledWith({
        requirementText: "test requirement"
      });
    });
  });

  it("shows running state after analysis starts", async () => {
    render(<Workbench />);

    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    const button = screen.getByRole("button", { name: /开始分析/ });

    fireEvent.change(textarea, { target: { value: "test requirement" } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText("分析中...")).toBeInTheDocument();
    });
  });

  it("displays the requirement text when session is active", async () => {
    render(<Workbench />);

    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    const button = screen.getByRole("button", { name: /开始分析/ });

    fireEvent.change(textarea, { target: { value: "test requirement" } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText("test requirement")).toBeInTheDocument();
    });
  });
});
