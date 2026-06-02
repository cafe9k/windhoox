import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TestCaseCard } from "./TestCaseCard";

describe("TestCaseCard", () => {
  const mockTestCase = {
    id: "TC-001",
    title: "正常支付流程",
    description: "验证用户使用支付宝完成支付的完整流程",
    preconditions: ["用户已登录", "购物车有商品"],
    steps: ["进入结算页", "选择支付宝", "完成支付"],
    expectedResult: "订单状态变为已支付",
    status: "pending" as const,
  };

  it("renders test case information", () => {
    const onStatusChange = vi.fn();
    render(<TestCaseCard testCase={mockTestCase} onStatusChange={onStatusChange} />);

    expect(screen.getByText("TC-001")).toBeInTheDocument();
    expect(screen.getByText("正常支付流程")).toBeInTheDocument();
    expect(screen.getByText("验证用户使用支付宝完成支付的完整流程")).toBeInTheDocument();
  });

  it("renders preconditions", () => {
    const onStatusChange = vi.fn();
    render(<TestCaseCard testCase={mockTestCase} onStatusChange={onStatusChange} />);

    expect(screen.getByText("用户已登录")).toBeInTheDocument();
    expect(screen.getByText("购物车有商品")).toBeInTheDocument();
  });

  it("renders test steps", () => {
    const onStatusChange = vi.fn();
    render(<TestCaseCard testCase={mockTestCase} onStatusChange={onStatusChange} />);

    expect(screen.getByText("进入结算页")).toBeInTheDocument();
    expect(screen.getByText("选择支付宝")).toBeInTheDocument();
    expect(screen.getByText("完成支付")).toBeInTheDocument();
  });

  it("renders expected result", () => {
    const onStatusChange = vi.fn();
    render(<TestCaseCard testCase={mockTestCase} onStatusChange={onStatusChange} />);

    expect(screen.getByText("订单状态变为已支付")).toBeInTheDocument();
  });

  it("shows pending status tag", () => {
    const onStatusChange = vi.fn();
    render(<TestCaseCard testCase={mockTestCase} onStatusChange={onStatusChange} />);

    expect(screen.getByText("待评审")).toBeInTheDocument();
  });

  it("shows action buttons for pending cases", () => {
    const onStatusChange = vi.fn();
    render(<TestCaseCard testCase={mockTestCase} onStatusChange={onStatusChange} />);

    expect(screen.getByText("接受")).toBeInTheDocument();
    expect(screen.getByText("驳回")).toBeInTheDocument();
  });

  it("calls onStatusChange when accept is clicked", () => {
    const onStatusChange = vi.fn();
    render(<TestCaseCard testCase={mockTestCase} onStatusChange={onStatusChange} />);

    fireEvent.click(screen.getByText("接受"));
    expect(onStatusChange).toHaveBeenCalledWith("TC-001", "accepted");
  });

  it("calls onStatusChange when reject is clicked", () => {
    const onStatusChange = vi.fn();
    render(<TestCaseCard testCase={mockTestCase} onStatusChange={onStatusChange} />);

    fireEvent.click(screen.getByText("驳回"));
    expect(onStatusChange).toHaveBeenCalledWith("TC-001", "rejected");
  });

  it("shows accepted status", () => {
    const acceptedCase = { ...mockTestCase, status: "accepted" as const };
    const onStatusChange = vi.fn();
    render(<TestCaseCard testCase={acceptedCase} onStatusChange={onStatusChange} />);

    expect(screen.getByText("已接受")).toBeInTheDocument();
    expect(screen.queryByText("接受")).not.toBeInTheDocument();
  });

  it("shows rejected status", () => {
    const rejectedCase = { ...mockTestCase, status: "rejected" as const };
    const onStatusChange = vi.fn();
    render(<TestCaseCard testCase={rejectedCase} onStatusChange={onStatusChange} />);

    expect(screen.getByText("已驳回")).toBeInTheDocument();
  });
});
