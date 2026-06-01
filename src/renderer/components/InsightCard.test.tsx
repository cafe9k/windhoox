import "@testing-library/jest-dom/vitest";
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { InsightCard } from "./InsightCard";

describe("InsightCard", () => {
  it("renders insight card with business rule", () => {
    const { container } = render(
      <InsightCard
        businessRule="Users must confirm before deletion"
        confidence="high"
      />
    );

    expect(container.textContent).toContain("Users must confirm before deletion");
  });

  it("renders insight card with risk", () => {
    const { container } = render(
      <InsightCard risk="Data loss if user forgets" confidence="medium" />
    );

    expect(container.textContent).toContain("Data loss if user forgets");
  });

  it("renders confidence badge", () => {
    const { container } = render(
      <InsightCard confidence="high" />
    );

    expect(container.textContent).toContain("Confidence:");
    expect(container.textContent).toContain("HIGH");
  });

  it("applies correct CSS class for confidence level", () => {
    const { container } = render(
      <InsightCard confidence="high" />
    );

    const card = container.querySelector(".insight-card");
    expect(card).toHaveClass("insight-high");
  });
});
