import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TestCaseCard } from "./TestCaseCard";

describe("TestCaseCard", () => {
  const mockTestCase = {
    id: "case-1",
    title: "测试用例标题",
    description: "测试描述",
    preconditions: ["用户已登录"],
    steps: ["步骤 1", "步骤 2"],
    expectedResult: "测试通过",
    status: "pending" as const,
  };

  it("renders test case title", () => {
    const onStatusChange = vi.fn();
    render(
      <TestCaseCard testCase={mockTestCase} onStatusChange={onStatusChange} />
    );

    expect(screen.getByText("测试用例标题")).toBeInTheDocument();
  });

  it("renders status badge", () => {
    const onStatusChange = vi.fn();
    render(
      <TestCaseCard testCase={mockTestCase} onStatusChange={onStatusChange} />
    );

    const card = screen.getByTestId("test-case-card");
    expect(card.textContent).toContain("待审核");
  });

  it("expands content when clicked", () => {
    const onStatusChange = vi.fn();
    render(
      <TestCaseCard testCase={mockTestCase} onStatusChange={onStatusChange} />
    );

    const header = screen.getByTestId("case-header");
    fireEvent.click(header);

    expect(screen.getByText("测试描述")).toBeInTheDocument();
    expect(screen.getByText("步骤 1")).toBeInTheDocument();
    expect(screen.getByText("测试通过")).toBeInTheDocument();
  });

  it("calls onStatusChange when accept button is clicked", () => {
    const onStatusChange = vi.fn();
    render(
      <TestCaseCard testCase={mockTestCase} onStatusChange={onStatusChange} />
    );

    const header = screen.getByTestId("case-header");
    fireEvent.click(header);

    const acceptBtn = screen.getByTestId("accept-btn");
    fireEvent.click(acceptBtn);

    expect(onStatusChange).toHaveBeenCalledWith("case-1", "accepted");
  });

  it("calls onStatusChange when reject button is clicked", () => {
    const onStatusChange = vi.fn();
    render(
      <TestCaseCard testCase={mockTestCase} onStatusChange={onStatusChange} />
    );

    const header = screen.getByTestId("case-header");
    fireEvent.click(header);

    const rejectBtn = screen.getByTestId("reject-btn");
    fireEvent.click(rejectBtn);

    expect(onStatusChange).toHaveBeenCalledWith("case-1", "rejected");
  });

  it("renders preconditions when provided", () => {
    const onStatusChange = vi.fn();
    render(
      <TestCaseCard testCase={mockTestCase} onStatusChange={onStatusChange} />
    );

    const header = screen.getByTestId("case-header");
    fireEvent.click(header);

    expect(screen.getByText("前置条件")).toBeInTheDocument();
    expect(screen.getByText("用户已登录")).toBeInTheDocument();
  });
});
