import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { TestCaseCard } from "./TestCaseCard";

describe("TestCaseCard", () => {
  const mockTestCase = {
    id: "case-1",
    title: "Test case title",
    description: "Test description",
    preconditions: ["User logged in"],
    steps: ["Step 1", "Step 2"],
    expectedResult: "Test passes",
    status: "pending" as const
  };

  it("renders test case title", () => {
    const onStatusChange = vi.fn();
    const { container } = render(
      <TestCaseCard testCase={mockTestCase} onStatusChange={onStatusChange} />
    );

    expect(container.textContent).toContain("Test case title");
  });

  it("renders status badge", () => {
    const onStatusChange = vi.fn();
    const { container } = render(
      <TestCaseCard testCase={mockTestCase} onStatusChange={onStatusChange} />
    );

    expect(container.textContent).toContain("Pending");
  });

  it("expands content when clicked", () => {
    const onStatusChange = vi.fn();
    const { container } = render(
      <TestCaseCard testCase={mockTestCase} onStatusChange={onStatusChange} />
    );

    const header = container.querySelector(".case-header");
    fireEvent.click(header!);

    expect(container.textContent).toContain("Test description");
    expect(container.textContent).toContain("Step 1");
    expect(container.textContent).toContain("Test passes");
  });

  it("calls onStatusChange when accept button is clicked", () => {
    const onStatusChange = vi.fn();
    const { container } = render(
      <TestCaseCard testCase={mockTestCase} onStatusChange={onStatusChange} />
    );

    // Expand the card first
    const header = container.querySelector(".case-header");
    fireEvent.click(header!);

    // Click accept button
    const acceptBtn = container.querySelector(".accept-btn");
    fireEvent.click(acceptBtn!);

    expect(onStatusChange).toHaveBeenCalledWith("case-1", "accepted");
  });

  it("calls onStatusChange when reject button is clicked", () => {
    const onStatusChange = vi.fn();
    const { container } = render(
      <TestCaseCard testCase={mockTestCase} onStatusChange={onStatusChange} />
    );

    // Expand the card first
    const header = container.querySelector(".case-header");
    fireEvent.click(header!);

    // Click reject button
    const rejectBtn = container.querySelector(".reject-btn");
    fireEvent.click(rejectBtn!);

    expect(onStatusChange).toHaveBeenCalledWith("case-1", "rejected");
  });

  it("renders preconditions when provided", () => {
    const onStatusChange = vi.fn();
    const { container } = render(
      <TestCaseCard testCase={mockTestCase} onStatusChange={onStatusChange} />
    );

    // Expand the card
    const header = container.querySelector(".case-header");
    fireEvent.click(header!);

    expect(container.textContent).toContain("Preconditions:");
    expect(container.textContent).toContain("User logged in");
  });
});
