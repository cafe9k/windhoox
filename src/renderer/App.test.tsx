import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { App } from "./App";

describe("App", () => {
  beforeEach(() => {
    window.windhoox = {
      appName: "Windhoox",
      platform: "darwin"
    };
  });

  it("renders the three-column workbench", () => {
    render(<App />);

    // Left panel
    expect(screen.getByText("新建测试任务")).toBeInTheDocument();
    expect(screen.getByText("共同购买推荐资源逻辑")).toBeInTheDocument();
    expect(screen.getByText("办签材料自动分类")).toBeInTheDocument();
    expect(screen.getByText("AI 配置")).toBeInTheDocument();

    // Center panel
    expect(screen.getByText("Agent 工作台")).toBeInTheDocument();
    expect(screen.getByText("开始一次测试设计任务")).toBeInTheDocument();
    expect(screen.getByText("快捷任务")).toBeInTheDocument();

    // Right panel - initially collapsed, click toggle to expand
    const toggleBtn = screen.getByTitle("展开测试资产池");
    fireEvent.click(toggleBtn);

    expect(screen.getByText("测试资产池")).toBeInTheDocument();
    expect(screen.getByText("候选用例")).toBeInTheDocument();
  });
});
