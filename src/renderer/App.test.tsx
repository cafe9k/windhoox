import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { App } from "./App";

describe("App", () => {
  beforeEach(() => {
    window.windhoox = {
      appName: "Windhoox",
      platform: "darwin"
    };
  });

  it("renders the workbench layout", () => {
    render(<App />);

    expect(screen.getByText("Task & Context")).toBeInTheDocument();
    expect(screen.getByText("Agent Analysis")).toBeInTheDocument();
    expect(screen.getByText("Test Asset Pool")).toBeInTheDocument();
  });
});
