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

    // New layout: LeftRail + Canvas + ActionGrid
    expect(screen.getByTestId("left-rail")).toBeInTheDocument();
    expect(screen.getByTestId("canvas")).toBeInTheDocument();
    expect(screen.getByTestId("action-grid")).toBeInTheDocument();
    expect(screen.getByText("代理分析")).toBeInTheDocument();
  });
});
