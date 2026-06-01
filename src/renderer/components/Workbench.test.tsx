import "@testing-library/jest-dom/vitest";
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Workbench } from "./Workbench";

describe("Workbench", () => {
  it("renders the workbench layout with three panels", () => {
    const { container } = render(<Workbench />);

    expect(container.querySelector(".workbench")).toBeInTheDocument();
    expect(container.querySelector(".left-panel")).toBeInTheDocument();
    expect(container.querySelector(".center-panel")).toBeInTheDocument();
    expect(container.querySelector(".right-panel")).toBeInTheDocument();
  });

  it("renders panel headers with correct labels", () => {
    const { container } = render(<Workbench />);

    const headers = container.querySelectorAll(".panel-header");
    expect(headers.length).toBe(3);
    expect(headers[0].textContent).toContain("Task & Context");
    expect(headers[1].textContent).toContain("Agent Analysis");
    expect(headers[2].textContent).toContain("Test Asset Pool");
  });

  it("renders empty states in all panels", () => {
    const { container } = render(<Workbench />);

    const emptyStates = container.querySelectorAll(".empty-state");
    expect(emptyStates.length).toBe(3);

    expect(emptyStates[0].textContent).toContain("No active task");
    expect(emptyStates[1].textContent).toContain("Create a task to begin analysis");
    expect(emptyStates[2].textContent).toContain("No test cases generated");
  });
});
