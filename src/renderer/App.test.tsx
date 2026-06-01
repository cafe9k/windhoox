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

    expect(screen.getByText("任务与上下文")).toBeInTheDocument();
    expect(screen.getByText("代理分析")).toBeInTheDocument();
    expect(screen.getByText("测试用例池")).toBeInTheDocument();
  });
});
