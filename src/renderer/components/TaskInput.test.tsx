import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TaskInput } from "./TaskInput";

describe("TaskInput", () => {
  it("renders the requirement textarea", () => {
    const onSubmit = vi.fn();
    render(<TaskInput onSubmit={onSubmit} />);

    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("renders the start button", () => {
    const onSubmit = vi.fn();
    render(<TaskInput onSubmit={onSubmit} />);

    const button = screen.getByRole("button", { name: /开始分析/ });
    expect(button).toBeInTheDocument();
  });

  it("disables the start button when textarea is empty", () => {
    const onSubmit = vi.fn();
    render(<TaskInput onSubmit={onSubmit} />);

    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "" } });

    const button = screen.getByRole("button", { name: /开始分析/ });
    expect(button).toBeDisabled();
  });

  it("enables the start button when textarea has content", () => {
    const onSubmit = vi.fn();
    render(<TaskInput onSubmit={onSubmit} />);

    const button = screen.getByRole("button", { name: /开始分析/ });
    expect(button).not.toBeDisabled();
  });

  it("renders with a default requirement pre-filled", () => {
    const onSubmit = vi.fn();
    render(<TaskInput onSubmit={onSubmit} />);

    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    expect(textarea.value.length).toBeGreaterThan(200);
    expect(textarea.value).toContain("退货");
  });

  it("calls onSubmit with requirement text when form is submitted", () => {
    const onSubmit = vi.fn();
    render(<TaskInput onSubmit={onSubmit} />);

    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "test requirement" } });

    const button = screen.getByRole("button", { name: /开始分析/ });
    fireEvent.click(button);

    expect(onSubmit).toHaveBeenCalledWith("test requirement");
  });

  it("disables textarea and button when isLoading is true", () => {
    const onSubmit = vi.fn();
    render(<TaskInput onSubmit={onSubmit} isLoading={true} />);

    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    expect(textarea).toBeDisabled();

    const button = screen.getByRole("button", { name: /分析中/ });
    expect(button).toBeDisabled();
  });

  it("shows analyzing message when isLoading is true", () => {
    const onSubmit = vi.fn();
    render(<TaskInput onSubmit={onSubmit} isLoading={true} />);

    expect(screen.getByRole("button", { name: /分析中/ })).toBeInTheDocument();
  });
});
