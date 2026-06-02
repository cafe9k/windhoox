import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Composer } from "./Composer";

describe("Composer", () => {
  it("renders textarea and submit button", () => {
    render(<Composer />);
    expect(screen.getByTestId("composer-input")).toBeInTheDocument();
    expect(screen.getByTestId("composer-submit")).toBeInTheDocument();
  });

  it("submit is disabled when input is empty", () => {
    render(<Composer />);
    expect(screen.getByTestId("composer-submit")).toBeDisabled();
  });

  it("submit is enabled when input has content", () => {
    render(<Composer />);
    fireEvent.change(screen.getByTestId("composer-input"), {
      target: { value: "测试需求" },
    });
    expect(screen.getByTestId("composer-submit")).not.toBeDisabled();
  });

  it("calls onSubmit with trimmed value", () => {
    const onSubmit = vi.fn();
    render(<Composer onSubmit={onSubmit} />);
    fireEvent.change(screen.getByTestId("composer-input"), {
      target: { value: "  测试需求  " },
    });
    fireEvent.click(screen.getByTestId("composer-submit"));
    expect(onSubmit).toHaveBeenCalledWith("测试需求");
  });

  it("clears input after submit", () => {
    render(<Composer onSubmit={vi.fn()} />);
    const input = screen.getByTestId("composer-input") as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: "需求" } });
    fireEvent.click(screen.getByTestId("composer-submit"));
    expect(input.value).toBe("");
  });

  it("renders status chips when provided", () => {
    render(
      <Composer statusChips={[{ label: "已接受 2" }, { label: "待评审 3" }]} />
    );
    expect(screen.getByText("已接受 2")).toBeInTheDocument();
    expect(screen.getByText("待评审 3")).toBeInTheDocument();
  });

  it("renders custom placeholder", () => {
    render(<Composer placeholder="请输入需求…" />);
    expect(screen.getByPlaceholderText("请输入需求…")).toBeInTheDocument();
  });

  it("is disabled when disabled prop is true", () => {
    render(<Composer disabled />);
    expect(screen.getByTestId("composer-input")).toBeDisabled();
  });

  it("renders toolbar chip buttons", () => {
    render(<Composer />);
    expect(screen.getByLabelText("添加附件")).toBeInTheDocument();
    expect(screen.getByLabelText("自动审查")).toBeInTheDocument();
    expect(screen.getByLabelText("选择模型")).toBeInTheDocument();
  });
});
