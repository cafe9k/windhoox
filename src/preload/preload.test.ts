// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const { exposeInMainWorld } = vi.hoisted(() => ({
  exposeInMainWorld: vi.fn()
}));

vi.mock("electron", () => ({
  contextBridge: {
    exposeInMainWorld
  }
}));

describe("preload contract", () => {
  beforeEach(() => {
    vi.resetModules();
    exposeInMainWorld.mockClear();
  });

  it("exposes the Windhoox bridge with stable app metadata", async () => {
    await import("./preload");

    expect(exposeInMainWorld).toHaveBeenCalledTimes(1);
    expect(exposeInMainWorld).toHaveBeenCalledWith("windhoox", {
      appName: "Windhoox",
      platform: process.platform
    });
  });
});
