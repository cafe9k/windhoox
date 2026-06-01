import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { act } from "react";
import { Workbench } from "./Workbench";
import type { AgentEvent } from "../../types/agent";

// Helper to find counter item by label and expected value
function expectCounterItem(label: string, expectedValue: number) {
  const items = document.querySelectorAll(".counter-item");
  const matchingItem = Array.from(items).find((item) => {
    const labelEl = item.querySelector(".counter-label");
    const valueEl = item.querySelector(".counter-value");
    return (
      labelEl?.textContent?.trim() === `${label}:` &&
      valueEl?.textContent?.trim() === `${expectedValue}`
    );
  });
  expect(matchingItem).toBeDefined();
}

describe("Workbench - Test Case Review Workflow", () => {
  const mockAgent = {
    startAnalysis: vi.fn().mockResolvedValue({ sessionId: "test-session-123" }),
    continueAnalysis: vi.fn().mockResolvedValue({ sessionId: "test-session-123" }),
    reviewCase: vi.fn().mockResolvedValue({ success: true }),
    loadSession: vi.fn().mockResolvedValue({ success: true }),
    onEvent: vi.fn()
  };

  let capturedCallback: ((event: AgentEvent) => void) | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    capturedCallback = null;
    mockAgent.onEvent.mockImplementation((callback: (event: AgentEvent) => void) => {
      capturedCallback = callback;
      return vi.fn();
    });
    (window as any).windhoox = { agent: mockAgent };
  });

  it("should display test case counters when cases are present", async () => {
    render(<Workbench />);

    // Start analysis
    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "Test requirement" } });
    fireEvent.click(screen.getByRole("button", { name: /开始分析/ }));

    // Wait for startAnalysis to be called and event listener to be registered
    await waitFor(() => {
      expect(mockAgent.startAnalysis).toHaveBeenCalled();
    });

    // Wait a bit for the event listener to be registered
    await waitFor(() => {
      expect(capturedCallback).not.toBeNull();
    });

    // Simulate case candidates event
    const casesEvent: AgentEvent = {
      type: "case_candidates",
      sessionId: "test-session-123",
      timestamp: Date.now(),
      cases: [
        {
          id: "case-1",
          title: "Verify login",
          description: "User can login",
          preconditions: [],
          steps: ["Enter credentials", "Click login"],
          expectedResult: "User logged in",
          status: "pending"
        },
        {
          id: "case-2",
          title: "Verify logout",
          description: "User can logout",
          preconditions: ["User is logged in"],
          steps: ["Click logout"],
          expectedResult: "User logged out",
          status: "pending"
        }
      ]
    };

    // Trigger the captured callback wrapped in act() to flush state updates
    await act(async () => {
      capturedCallback!(casesEvent);
    });

    await waitFor(() => {
      expectCounterItem("待审核", 2);
      expectCounterItem("已接受", 0);
      expectCounterItem("已拒绝", 0);
      expectCounterItem("需要澄清", 0);
    });
  });

  it("should update counters when case status changes", async () => {
    render(<Workbench />);

    // Start analysis
    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "Test requirement" } });
    fireEvent.click(screen.getByRole("button", { name: /开始分析/ }));

    // Wait for startAnalysis to be called and event listener to be registered
    await waitFor(() => {
      expect(mockAgent.startAnalysis).toHaveBeenCalled();
      expect(capturedCallback).not.toBeNull();
    });

    // Simulate case candidates event
    const casesEvent: AgentEvent = {
      type: "case_candidates",
      sessionId: "test-session-123",
      timestamp: Date.now(),
      cases: [
        {
          id: "case-1",
          title: "Verify login",
          description: "User can login",
          preconditions: [],
          steps: ["Enter credentials"],
          expectedResult: "Success",
          status: "pending"
        },
        {
          id: "case-2",
          title: "Verify logout",
          description: "User can logout",
          preconditions: [],
          steps: ["Click logout"],
          expectedResult: "Success",
          status: "pending"
        }
      ]
    };

    // Trigger the captured callback wrapped in act() to flush state updates
    await act(async () => {
      capturedCallback!(casesEvent);
    });

    await waitFor(() => {
      expectCounterItem("待审核", 2);
    });

    // Expand first case and click accept
    const caseHeaders = screen.getAllByText("Verify login");
    fireEvent.click(caseHeaders[0]);

    await waitFor(() => {
      const acceptButton = screen.getByText("接受");
      fireEvent.click(acceptButton);
    });

    await waitFor(() => {
      expect(mockAgent.reviewCase).toHaveBeenCalledWith({
        sessionId: "test-session-123",
        caseId: "case-1",
        status: "accepted"
      });
    });

    // Verify counters update
    await waitFor(() => {
      expectCounterItem("待审核", 1);
      expectCounterItem("已接受", 1);
    });
  });

  it("should support all review status types", async () => {
    render(<Workbench />);

    // Start analysis
    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "Test requirement" } });
    fireEvent.click(screen.getByRole("button", { name: /开始分析/ }));

    // Wait for startAnalysis to be called and event listener to be registered
    await waitFor(() => {
      expect(mockAgent.startAnalysis).toHaveBeenCalled();
      expect(capturedCallback).not.toBeNull();
    });

    // Simulate case candidates event with various statuses
    const casesEvent: AgentEvent = {
      type: "case_candidates",
      sessionId: "test-session-123",
      timestamp: Date.now(),
      cases: [
        {
          id: "case-1",
          title: "Verify login",
          description: "User can login",
          preconditions: [],
          steps: ["Enter credentials"],
          expectedResult: "Success",
          status: "pending"
        },
        {
          id: "case-2",
          title: "Verify logout",
          description: "User can logout",
          preconditions: [],
          steps: ["Click logout"],
          expectedResult: "Success",
          status: "accepted"
        },
        {
          id: "case-3",
          title: "Verify delete",
          description: "User can delete",
          preconditions: [],
          steps: ["Click delete"],
          expectedResult: "Success",
          status: "rejected"
        },
        {
          id: "case-4",
          title: "Verify update",
          description: "User can update",
          preconditions: [],
          steps: ["Click update"],
          expectedResult: "Success",
          status: "ask_product"
        }
      ]
    };

    // Trigger the captured callback wrapped in act() to flush state updates
    await act(async () => {
      capturedCallback!(casesEvent);
    });

    await waitFor(() => {
      expectCounterItem("待审核", 1);
      expectCounterItem("已接受", 1);
      expectCounterItem("已拒绝", 1);
      expectCounterItem("需要澄清", 1);
    }, { timeout: 5000 });
  });
});
