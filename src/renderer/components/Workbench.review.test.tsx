import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { act } from "react";
import { Workbench } from "./Workbench";
import type { AgentEvent } from "../../types/agent";

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

    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "Test requirement" } });
    fireEvent.click(screen.getByRole("button", { name: /开始分析/ }));

    await waitFor(() => {
      expect(mockAgent.startAnalysis).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(capturedCallback).not.toBeNull();
    });

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

    await act(async () => {
      capturedCallback!(casesEvent);
    });

    await waitFor(() => {
      expect(screen.getByTestId("counter-pending")).toHaveTextContent("2");
      expect(screen.getByTestId("counter-accepted")).toHaveTextContent("0");
      expect(screen.getByTestId("counter-rejected")).toHaveTextContent("0");
      expect(screen.getByTestId("counter-clarification")).toHaveTextContent("0");
    });
  });

  it("should update counters when case status changes", async () => {
    render(<Workbench />);

    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "Test requirement" } });
    fireEvent.click(screen.getByRole("button", { name: /开始分析/ }));

    await waitFor(() => {
      expect(mockAgent.startAnalysis).toHaveBeenCalled();
      expect(capturedCallback).not.toBeNull();
    });

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

    await act(async () => {
      capturedCallback!(casesEvent);
    });

    await waitFor(() => {
      expect(screen.getByTestId("counter-pending")).toHaveTextContent("2");
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
      expect(screen.getByTestId("counter-pending")).toHaveTextContent("1");
      expect(screen.getByTestId("counter-accepted")).toHaveTextContent("1");
    });
  });

  it("should support all review status types", async () => {
    render(<Workbench />);

    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "Test requirement" } });
    fireEvent.click(screen.getByRole("button", { name: /开始分析/ }));

    await waitFor(() => {
      expect(mockAgent.startAnalysis).toHaveBeenCalled();
      expect(capturedCallback).not.toBeNull();
    });

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

    await act(async () => {
      capturedCallback!(casesEvent);
    });

    await waitFor(() => {
      expect(screen.getByTestId("counter-pending")).toHaveTextContent("1");
      expect(screen.getByTestId("counter-accepted")).toHaveTextContent("1");
      expect(screen.getByTestId("counter-rejected")).toHaveTextContent("1");
      expect(screen.getByTestId("counter-clarification")).toHaveTextContent("1");
    }, { timeout: 5000 });
  });
});
