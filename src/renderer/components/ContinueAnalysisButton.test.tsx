import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ContinueAnalysisButton } from "./ContinueAnalysisButton";
import type { AgentState } from "../state/agent-state";

describe("ContinueAnalysisButton", () => {
  const mockOnContinue = vi.fn();

  const mockState: AgentState = {
    sessionId: "test-session-123",
    requirement: "Test requirement",
    status: "completed",
    insights: [
      {
        id: "insight-1",
        businessRule: "Test rule",
        confidence: "high",
      },
    ],
    questions: [
      {
        id: "question-1",
        category: "qa",
        question: "Test question",
      },
    ],
    cases: [
      {
        id: "case-1",
        title: "Test case 1",
        description: "Test description",
        preconditions: [],
        steps: [],
        expectedResult: "Success",
        status: "accepted",
      },
      {
        id: "case-2",
        title: "Test case 2",
        description: "Test description",
        preconditions: [],
        steps: [],
        expectedResult: "Success",
        status: "rejected",
      },
    ],
    coverage: [
      {
        requirementId: "req-1",
        caseIds: ["case-1"],
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the continue analysis button", () => {
    render(
      <ContinueAnalysisButton state={mockState} onContinue={mockOnContinue} />
    );

    const button = screen.getByTestId("continue-button");
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
  });

  it("calls onContinue with correct payload when clicked twice", async () => {
    render(
      <ContinueAnalysisButton state={mockState} onContinue={mockOnContinue} />
    );

    // First click shows the input form
    const button = screen.getByTestId("continue-button");
    fireEvent.click(button);

    // Second click submits
    const submitButton = screen.getAllByRole("button", { name: /继续分析/ })[0];
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
              category: "qa",
              text: "Test question",
            },
          ],
        },
        followUpPrompt: undefined,
      });
    });
  });

  it("shows loading state after submission", async () => {
    mockOnContinue.mockImplementation(() => new Promise(() => {}));

    render(
      <ContinueAnalysisButton state={mockState} onContinue={mockOnContinue} />
    );

    const button = screen.getByTestId("continue-button");
    fireEvent.click(button);

    const submitButton = screen.getAllByRole("button", { name: /继续分析/ })[0];
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(submitButton).toBeDisabled();
      expect(submitButton).toHaveTextContent(/分析中/);
    });
  });

  it("shows and hides follow-up input when clicking button and cancel", () => {
    render(
      <ContinueAnalysisButton state={mockState} onContinue={mockOnContinue} />
    );

    // Initially no input visible
    expect(screen.queryByTestId("prompt-textarea")).not.toBeInTheDocument();

    // Click to show input
    const button = screen.getByTestId("continue-button");
    fireEvent.click(button);

    expect(screen.getByTestId("prompt-textarea")).toBeInTheDocument();

    // Click cancel to hide
    const cancelButton = screen.getByTestId("cancel-button");
    fireEvent.click(cancelButton);

    expect(screen.queryByTestId("prompt-textarea")).not.toBeInTheDocument();
  });

  it("includes follow-up prompt in payload when provided", async () => {
    render(
      <ContinueAnalysisButton state={mockState} onContinue={mockOnContinue} />
    );

    const button = screen.getByTestId("continue-button");
    fireEvent.click(button);

    const textarea = screen.getByTestId("prompt-textarea") as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "请考虑边界情况" } });

    const submitButton = screen.getAllByRole("button", { name: /继续分析/ })[0];
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
              category: "qa",
              text: "Test question",
            },
          ],
        },
        followUpPrompt: "请考虑边界情况",
      });
    });
  });

  it("disables button when there are no cases", () => {
    const emptyState: AgentState = {
      ...mockState,
      cases: [],
    };

    render(
      <ContinueAnalysisButton state={emptyState} onContinue={mockOnContinue} />
    );

    const button = screen.getByTestId("continue-button");
    expect(button).toBeDisabled();
  });

  it("shows counter summary above button", () => {
    render(
      <ContinueAnalysisButton state={mockState} onContinue={mockOnContinue} />
    );

    expect(screen.getByTestId("summary-reviewed")).toHaveTextContent("已审核");
    expect(screen.getByTestId("summary-reviewed")).toHaveTextContent("2 个测试用例");

    expect(screen.getByTestId("summary-questions")).toHaveTextContent("待澄清");
    expect(screen.getByTestId("summary-questions")).toHaveTextContent("1 个问题");
  });
});
