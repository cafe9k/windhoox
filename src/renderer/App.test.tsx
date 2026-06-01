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

  it("renders the Windhoox hello world screen", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "Hello, Windhoox" })).toBeInTheDocument();
    expect(screen.getByText("Electron + Vite + React + TypeScript")).toBeInTheDocument();
    expect(screen.getByText("Running on darwin")).toBeInTheDocument();
  });
});
