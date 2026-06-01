import "@testing-library/jest-dom/vitest";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, fireEvent, waitFor } from "@testing-library/react";
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
    const { container } = render(<Workbench />);

    expect(container.querySelector(".workbench")).toBeInTheDocument();
    expect(container.querySelector(".left-panel")).toBeInTheDocument();
    expect(container.querySelector(".center-panel")).toBeInTheDocument();
    expect(container.querySelector(".right-panel")).toBeInTheDocument();
  });

  it("renders panel headers with correct labels", () => {
    const { container } = render(<Workbench />);

    const headers = container.querySelectorAll(".panel-header");
    expect(headers.length).toBe(3);
    expect(headers[0].textContent).toContain("Task & Context");
    expect(headers[1].textContent).toContain("Agent Analysis");
    expect(headers[2].textContent).toContain("Test Asset Pool");
  });

  it("shows empty state when no session exists", () => {
    const { container } = render(<Workbench />);

    expect(container.textContent).toContain("Create a task to begin analysis");
    expect(container.textContent).toContain("No test cases generated");
  });

  it("shows task input form when no session exists", () => {
    const { container } = render(<Workbench />);

    const textarea = container.querySelector("textarea");
    expect(textarea).toBeInTheDocument();
  });

  it("calls agent API when form is submitted", async () => {
    const { container } = render(<Workbench />);

    const textarea = container.querySelector("textarea") as HTMLTextAreaElement;
    const button = container.querySelector(".start-button") as HTMLButtonElement;

    fireEvent.change(textarea, { target: { value: "test requirement" } });
    fireEvent.click(button);

    await waitFor(() => {
      expect((window as any).windhoox.agent.startAnalysis).toHaveBeenCalledWith({
        requirementText: "test requirement"
      });
    });
  });

  it("shows running state after analysis starts", async () => {
    const { container } = render(<Workbench />);

    const textarea = container.querySelector("textarea") as HTMLTextAreaElement;
    const button = container.querySelector(".start-button") as HTMLButtonElement;

    fireEvent.change(textarea, { target: { value: "test requirement" } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(container.textContent).toContain("Analyzing");
    });
  });

  it("displays the requirement text when session is active", async () => {
    const { container } = render(<Workbench />);

    const textarea = container.querySelector("textarea") as HTMLTextAreaElement;
    const button = container.querySelector(".start-button") as HTMLButtonElement;

    fireEvent.change(textarea, { target: { value: "test requirement" } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(container.textContent).toContain("test requirement");
    });
  });
});
