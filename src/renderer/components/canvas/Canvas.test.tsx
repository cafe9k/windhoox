import "@testing-library/jest-dom/vitest";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Canvas } from "./Canvas";

describe("Canvas", () => {
  it("renders with default title", () => {
    render(<Canvas><div>内容</div></Canvas>);
    expect(screen.getByText("新对话")).toBeInTheDocument();
  });

  it("renders custom title", () => {
    render(<Canvas title="支付流程分析"><div /></Canvas>);
    expect(screen.getByText("支付流程分析")).toBeInTheDocument();
  });

  it("renders children in body", () => {
    render(<Canvas><div data-testid="child">内容区</div></Canvas>);
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  it("renders footer when provided", () => {
    render(
      <Canvas footer={<div data-testid="footer">底部</div>}>
        <div />
      </Canvas>
    );
    expect(screen.getByTestId("footer")).toBeInTheDocument();
  });

  it("renders headerExtra when provided", () => {
    render(
      <Canvas headerExtra={<span data-testid="extra">统计</span>}>
        <div />
      </Canvas>
    );
    expect(screen.getByTestId("extra")).toBeInTheDocument();
  });
});
