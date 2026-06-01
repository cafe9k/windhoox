import "@testing-library/jest-dom/vitest";
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { InsightCard } from "./InsightCard";

describe("InsightCard", () => {
  it("renders insight card with business rule", () => {
    const { container } = render(
      <InsightCard
        businessRule="用户必须在删除前确认"
        confidence="high"
      />
    );

    expect(container.textContent).toContain("用户必须在删除前确认");
  });

  it("renders insight card with risk", () => {
    const { container } = render(
      <InsightCard risk="如果用户忘记可能导致数据丢失" confidence="medium" />
    );

    expect(container.textContent).toContain("如果用户忘记可能导致数据丢失");
  });

  it("renders confidence badge", () => {
    const { container } = render(
      <InsightCard confidence="high" />
    );

    expect(container.textContent).toContain("信心度:");
    expect(container.textContent).toContain("高");
  });

  it("applies correct CSS class for confidence level", () => {
    const { container } = render(
      <InsightCard confidence="high" />
    );

    const card = container.querySelector(".insight-card");
    expect(card).toHaveClass("insight-high");
  });
});
