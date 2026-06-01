import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { TaskInput } from "./TaskInput";

describe("TaskInput", () => {
  it("renders the requirement textarea", () => {
    const onSubmit = vi.fn();
    const { container } = render(<TaskInput onSubmit={onSubmit} />);

    const textarea = container.querySelector("textarea");
    expect(textarea).toBeInTheDocument();
  });

  it("renders the start button", () => {
    const onSubmit = vi.fn();
    const { container } = render(<TaskInput onSubmit={onSubmit} />);

    const button = container.querySelector(".start-button");
    expect(button).toBeInTheDocument();
    expect(button?.textContent).toBe("开始分析");
  });

  it("disables the start button when textarea is empty", () => {
    const onSubmit = vi.fn();
    const { container } = render(<TaskInput onSubmit={onSubmit} />);

    const button = container.querySelector(".start-button") as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  it("enables the start button when textarea has content", () => {
    const onSubmit = vi.fn();
    const { container } = render(<TaskInput onSubmit={onSubmit} />);

    const textarea = container.querySelector("textarea") as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "test requirement" } });

    const button = container.querySelector(".start-button") as HTMLButtonElement;
    expect(button.disabled).toBe(false);
  });

  it("calls onSubmit with requirement text when form is submitted", () => {
    const onSubmit = vi.fn();
    const { container } = render(<TaskInput onSubmit={onSubmit} />);

    const textarea = container.querySelector("textarea") as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "test requirement" } });

    const button = container.querySelector(".start-button") as HTMLButtonElement;
    fireEvent.click(button);

    expect(onSubmit).toHaveBeenCalledWith("test requirement");
  });

  it("disables textarea and button when isLoading is true", () => {
    const onSubmit = vi.fn();
    const { container } = render(<TaskInput onSubmit={onSubmit} isLoading={true} />);

    const textarea = container.querySelector("textarea") as HTMLTextAreaElement;
    const button = container.querySelector(".start-button") as HTMLButtonElement;

    expect(textarea.disabled).toBe(true);
    expect(button.disabled).toBe(true);
  });

  it("shows analyzing message when isLoading is true", () => {
    const onSubmit = vi.fn();
    const { container } = render(<TaskInput onSubmit={onSubmit} isLoading={true} />);

    const button = container.querySelector(".start-button");
    expect(button?.textContent).toBe("分析中...");
  });

  it("trims whitespace before calling onSubmit", () => {
    const onSubmit = vi.fn();
    const { container } = render(<TaskInput onSubmit={onSubmit} />);

    const textarea = container.querySelector("textarea") as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "  test requirement  " } });

    const button = container.querySelector(".start-button") as HTMLButtonElement;
    fireEvent.click(button);

    expect(onSubmit).toHaveBeenCalledWith("  test requirement  ");
  });
});
