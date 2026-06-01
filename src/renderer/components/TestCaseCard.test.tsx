import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { TestCaseCard } from "./TestCaseCard";

describe("TestCaseCard", () => {
  const mockTestCase = {
    id: "case-1",
    title: "测试用例标题",
    description: "测试描述",
    preconditions: ["用户已登录"],
    steps: ["步骤 1", "步骤 2"],
    expectedResult: "测试通过",
    status: "pending" as const
  };

  it("renders test case title", () => {
    const onStatusChange = vi.fn();
    const { container } = render(
      <TestCaseCard testCase={mockTestCase} onStatusChange={onStatusChange} />
    );

    expect(container.textContent).toContain("测试用例标题");
  });

  it("renders status badge", () => {
    const onStatusChange = vi.fn();
    const { container } = render(
      <TestCaseCard testCase={mockTestCase} onStatusChange={onStatusChange} />
    );

    expect(container.textContent).toContain("待审核");
  });

  it("expands content when clicked", () => {
    const onStatusChange = vi.fn();
    const { container } = render(
      <TestCaseCard testCase={mockTestCase} onStatusChange={onStatusChange} />
    );

    const header = container.querySelector(".case-header");
    fireEvent.click(header!);

    expect(container.textContent).toContain("测试描述");
    expect(container.textContent).toContain("步骤 1");
    expect(container.textContent).toContain("测试通过");
  });

  it("calls onStatusChange when accept button is clicked", () => {
    const onStatusChange = vi.fn();
    const { container } = render(
      <TestCaseCard testCase={mockTestCase} onStatusChange={onStatusChange} />
    );

    const header = container.querySelector(".case-header");
    fireEvent.click(header!);

    const acceptBtn = container.querySelector(".accept-btn");
    fireEvent.click(acceptBtn!);

    expect(onStatusChange).toHaveBeenCalledWith("case-1", "accepted");
  });

  it("calls onStatusChange when reject button is clicked", () => {
    const onStatusChange = vi.fn();
    const { container } = render(
      <TestCaseCard testCase={mockTestCase} onStatusChange={onStatusChange} />
    );

    const header = container.querySelector(".case-header");
    fireEvent.click(header!);

    const rejectBtn = container.querySelector(".reject-btn");
    fireEvent.click(rejectBtn!);

    expect(onStatusChange).toHaveBeenCalledWith("case-1", "rejected");
  });

  it("renders preconditions when provided", () => {
    const onStatusChange = vi.fn();
    const { container } = render(
      <TestCaseCard testCase={mockTestCase} onStatusChange={onStatusChange} />
    );

    const header = container.querySelector(".case-header");
    fireEvent.click(header!);

    expect(container.textContent).toContain("前置条件:");
    expect(container.textContent).toContain("用户已登录");
  });
});
