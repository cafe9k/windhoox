// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const { exposeInMainWorld } = vi.hoisted(() => ({
  exposeInMainWorld: vi.fn()
}));

const mockIpcRenderer = vi.hoisted(() => ({
  invoke: vi.fn(),
  on: vi.fn(),
  removeListener: vi.fn()
}));

vi.mock("electron", () => ({
  contextBridge: {
    exposeInMainWorld
  },
  ipcRenderer: mockIpcRenderer
}));

describe("preload contract", () => {
  beforeEach(() => {
    vi.resetModules();
    exposeInMainWorld.mockClear();
    mockIpcRenderer.invoke.mockClear();
    mockIpcRenderer.on.mockClear();
    mockIpcRenderer.removeListener.mockClear();
  });

  it("exposes the Windhoox bridge with stable app metadata", async () => {
    await import("./preload");

    expect(exposeInMainWorld).toHaveBeenCalledTimes(1);
    const call = exposeInMainWorld.mock.calls[0];
    expect(call[0]).toBe("windhoox");
    expect(call[1]).toMatchObject({
      appName: "Windhoox",
      platform: expect.any(String)
    });
  });

  it("exposes the agent API with expected methods", async () => {
    await import("./preload");

    const call = exposeInMainWorld.mock.calls[0];
    const bridge = call[1];
    expect(bridge.agent).toBeDefined();
    expect(bridge.agent).toHaveProperty("startAnalysis");
    expect(bridge.agent).toHaveProperty("continueAnalysis");
    expect(bridge.agent).toHaveProperty("reviewCase");
    expect(bridge.agent).toHaveProperty("loadSession");
    expect(bridge.agent).toHaveProperty("onEvent");
  });

  it("startAnalysis invokes the agent:start-analysis channel", async () => {
    await import("./preload");

    const call = exposeInMainWorld.mock.calls[0];
    const { agent } = call[1];
    const payload = { requirementText: "test requirement" };

    mockIpcRenderer.invoke.mockResolvedValue({ sessionId: "123" });
    const result = await agent.startAnalysis(payload);

    expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
      "agent:start-analysis",
      payload
    );
    expect(result).toEqual({ sessionId: "123" });
  });

  it("continueAnalysis invokes the agent:continue-analysis channel", async () => {
    await import("./preload");

    const call = exposeInMainWorld.mock.calls[0];
    const { agent } = call[1];
    const payload = {
      sessionId: "123",
      followUpPrompt: "more details"
    };

    mockIpcRenderer.invoke.mockResolvedValue({ success: true });
    await agent.continueAnalysis(payload);

    expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
      "agent:continue-analysis",
      payload
    );
  });

  it("onEvent registers a listener for agent events", async () => {
    await import("./preload");

    const call = exposeInMainWorld.mock.calls[0];
    const { agent } = call[1];
    const listener = vi.fn();

    agent.onEvent(listener);

    expect(mockIpcRenderer.on).toHaveBeenCalledWith("agent:event", expect.any(Function));
  });

  it("onEvent returns an unsubscribe function", async () => {
    await import("./preload");

    const call = exposeInMainWorld.mock.calls[0];
    const { agent } = call[1];
    const listener = vi.fn();

    const unsubscribe = agent.onEvent(listener);
    const registeredListener = mockIpcRenderer.on.mock.calls[0][1];
    unsubscribe();

    expect(mockIpcRenderer.removeListener).toHaveBeenCalledWith(
      "agent:event",
      registeredListener
    );
  });
});
