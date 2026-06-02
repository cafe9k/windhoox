import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ActionGrid } from "./ActionGrid";

describe("ActionGrid", () => {
  it("renders all 5 action cards", () => {
    render(<ActionGrid />);
    expect(screen.getByLabelText("文件")).toBeInTheDocument();
    expect(screen.getByLabelText("侧边聊天")).toBeInTheDocument();
    expect(screen.getByLabelText("浏览器")).toBeInTheDocument();
    expect(screen.getByLabelText("审查")).toBeInTheDocument();
    expect(screen.getByLabelText("终端")).toBeInTheDocument();
  });

  it("renders keyboard shortcut badges", () => {
    render(<ActionGrid />);
    expect(screen.getByText("⌘P")).toBeInTheDocument();
    expect(screen.getByText("⌘T")).toBeInTheDocument();
    expect(screen.getByText("⌃⇧G")).toBeInTheDocument();
  });

  it("calls onAction with correct key when card is clicked", () => {
    const onAction = vi.fn();
    render(<ActionGrid onAction={onAction} />);
    fireEvent.click(screen.getByLabelText("文件"));
    expect(onAction).toHaveBeenCalledWith("file");
    fireEvent.click(screen.getByLabelText("终端"));
    expect(onAction).toHaveBeenCalledWith("terminal");
  });
});
