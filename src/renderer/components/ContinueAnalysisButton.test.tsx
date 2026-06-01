import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent, waitFor } from "@testing-library/react";
import { ContinueAnalysisButton } from "./ContinueAnalysisButton";
import type { AgentState } from "../state/agent-state";

describe("ContinueAnalysisButton", () => {
  const mockOnContinue = vi.fn();

  const mockState: AgentState = {
    sessionId: "test-session-123",
    requirement: "Test requirement",
    insights: [
      {
        id: "insight-1",
        businessRule: "Test rule",
        confidence: "high"
      }
    ],
    questions: [
      {
        id: "question-1",
        category: "clarification",
        question: "Test question"
      }
    ],
    cases: [
      {
        id: "case-1",
        title: "Test case 1",
        description: "Test description",
        preconditions: [],
        steps: [],
        expectedResult: "Success",
        status: "accepted"
      },
      {
        id: "case-2",
        title: "Test case 2",
        description: "Test description",
        preconditions: [],
        steps: [],
        expectedResult: "Success",
        status: "rejected"
      }
    ],
    coverage: [
      {
        requirementId: "req-1",
        caseIds: ["case-1"]
      }
    ]
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the continue analysis button", () => {
    const { container } = render(
      <ContinueAnalysisButton state={mockState} onContinue={mockOnContinue} />
    );

    const button = container.querySelector(".continue-button");
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
  });

  it("calls onContinue with correct payload when clicked twice", async () => {
    const { container } = render(
      <ContinueAnalysisButton state={mockState} onContinue={mockOnContinue} />
    );

    // First click shows the input form
    const button = container.querySelector(".continue-button") as HTMLButtonElement;
    fireEvent.click(button);

    // Second click submits the form
    const submitButton = container.querySelector(".continue-button") as HTMLButtonElement;
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnContinue).toHaveBeenCalledWith({
        sessionId: "test-session-123",
        previousSessionId: "test-session-123",
        feedback: {
          acceptedCaseIds: ["case-1"],
          rejectedCaseIds: ["case-2"],
          unresolvedQuestions: [
            {
              id: "question-1",
              category: "clarification",
              text: "Test question"
            }
          ]
        },
        followUpPrompt: undefined
      });
    });
  });

  it("shows loading state after submission", async () => {
    mockOnContinue.mockImplementation(() => new Promise(() => {})); // Never resolves

    const { container } = render(
      <ContinueAnalysisButton state={mockState} onContinue={mockOnContinue} />
    );

    // First click shows the input form
    const button = container.querySelector(".continue-button") as HTMLButtonElement;
    fireEvent.click(button);

    // Second click submits the form
    const submitButton = container.querySelector(".continue-button") as HTMLButtonElement;
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(submitButton).toBeDisabled();
      expect(submitButton).toHaveTextContent(/分析中/);
    });
  });

  it("shows and hides follow-up input when clicking button and cancel", () => {
    const { container } = render(
      <ContinueAnalysisButton state={mockState} onContinue={mockOnContinue} />
    );

    // Initially no input visible
    expect(container.querySelector(".prompt-textarea")).not.toBeInTheDocument();

    // Click to show input
    const button = container.querySelector(".continue-button") as HTMLButtonElement;
    fireEvent.click(button);

    // Input should be visible
    expect(container.querySelector(".prompt-textarea")).toBeInTheDocument();

    // Click cancel to hide
    const cancelButton = container.querySelector(".cancel-button") as HTMLButtonElement;
    fireEvent.click(cancelButton);

    // Input should be hidden again
    expect(container.querySelector(".prompt-textarea")).not.toBeInTheDocument();
  });

  it("includes follow-up prompt in payload when provided", async () => {
    const { container } = render(
      <ContinueAnalysisButton state={mockState} onContinue={mockOnContinue} />
    );

    // Click to show input
    const button = container.querySelector(".continue-button") as HTMLButtonElement;
    fireEvent.click(button);

    // Type in the textarea
    const textarea = container.querySelector(".prompt-textarea") as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "请考虑边界情况" } });

    // Click submit
    const submitButton = container.querySelector(".continue-button") as HTMLButtonElement;
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnContinue).toHaveBeenCalledWith({
        sessionId: "test-session-123",
        previousSessionId: "test-session-123",
        feedback: {
          acceptedCaseIds: ["case-1"],
          rejectedCaseIds: ["case-2"],
          unresolvedQuestions: [
            {
              id: "question-1",
              category: "clarification",
              text: "Test question"
            }
          ]
        },
        followUpPrompt: "请考虑边界情况"
      });
    });
  });

  it("disables button when there are no cases", () => {
    const emptyState: AgentState = {
      ...mockState,
      cases: []
    };

    const { container } = render(
      <ContinueAnalysisButton state={emptyState} onContinue={mockOnContinue} />
    );

    const button = container.querySelector(".continue-button") as HTMLButtonElement;
    expect(button).toBeDisabled();
  });

  it("shows counter summary above button", () => {
    const { container } = render(
      <ContinueAnalysisButton state={mockState} onContinue={mockOnContinue} />
    );

    const labels = container.querySelectorAll(".summary-label");
    const values = container.querySelectorAll(".summary-value");

    expect(labels.length).toBe(2);
    expect(values.length).toBe(2);

    expect(labels[0]).toHaveTextContent("已审核:");
    expect(values[0]).toHaveTextContent("2 个测试用例");

    expect(labels[1]).toHaveTextContent("待澄清:");
    expect(values[1]).toHaveTextContent("1 个问题");
  });
});
