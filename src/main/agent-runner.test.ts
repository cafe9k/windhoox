import { describe, it, expect } from "vitest";
import { runLocalAgent } from "./agent-runner";

describe("runLocalAgent", () => {
  it("returns events and artifacts on successful run", async () => {
    const input = {
      sessionId: "test-123",
      requirementText: "测试需求"
    };

    const result = await runLocalAgent(input);

    expect(result.events).toBeDefined();
    expect(result.events.length).toBeGreaterThan(0);
    expect(result.events[0].type).toBe("run_started");
    expect(result.artifacts).toBeDefined();
    expect(result.artifacts.conversationPath).toContain("test-123");
  });

  it("includes run_started event with session id", async () => {
    const input = {
      sessionId: "test-456",
      requirementText: "另一个需求"
    };

    const result = await runLocalAgent(input);

    const startedEvent = result.events.find((e) => e.type === "run_started");
    expect(startedEvent).toBeDefined();
    expect(startedEvent?.sessionId).toBe("test-456");
  });

  it("includes run_completed event on success", async () => {
    const input = {
      sessionId: "test-789",
      requirementText: "需求描述"
    };

    const result = await runLocalAgent(input);

    const completedEvent = result.events.find((e) => e.type === "run_completed");
    expect(completedEvent).toBeDefined();
    expect(completedEvent?.type).toBe("run_completed");
  });
});
