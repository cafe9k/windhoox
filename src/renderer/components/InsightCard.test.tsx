import "@testing-library/jest-dom/vitest";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { InsightCard } from "./InsightCard";

describe("InsightCard", () => {
  it("renders insight card with business rule", () => {
    render(
      <InsightCard
        businessRule="用户必须在删除前确认"
        confidence="high"
      />
    );

    expect(screen.getByText("用户必须在删除前确认")).toBeInTheDocument();
  });

  it("renders insight card with risk", () => {
    render(
      <InsightCard risk="如果用户忘记可能导致数据丢失" confidence="medium" />
    );

    expect(screen.getByText("如果用户忘记可能导致数据丢失")).toBeInTheDocument();
  });

  it("renders confidence badge", () => {
    render(<InsightCard confidence="high" />);

    const card = screen.getByTestId("insight-card");
    expect(card.textContent).toContain("信心度:");
    expect(card.textContent).toContain("高");
  });
});
