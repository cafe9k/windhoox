import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import path from "node:path";

// Mock electron app
const mockIsPackaged = vi.fn(() => false);

vi.mock("electron", () => ({
  app: {
    get isPackaged() {
      return mockIsPackaged();
    },
  },
}));

const {
  getClaudeResourcesPath,
  getClaudeAgentsPath,
  getClaudeSkillsPath,
  isPackaged,
} = await import("./paths.js");

describe("claude/paths", () => {
  const originalResourcesPath = process.resourcesPath;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore resourcesPath
    Object.defineProperty(process, "resourcesPath", {
      value: originalResourcesPath,
      writable: true,
    });
  });

  describe("isPackaged", () => {
    it("returns false in development", () => {
      mockIsPackaged.mockReturnValue(false);
      expect(isPackaged()).toBe(false);
    });

    it("returns true in production", () => {
      mockIsPackaged.mockReturnValue(true);
      expect(isPackaged()).toBe(true);
    });
  });

  describe("getClaudeResourcesPath", () => {
    it("returns project path in development", () => {
      mockIsPackaged.mockReturnValue(false);
      const result = getClaudeResourcesPath();
      expect(result).toBe(path.join(process.cwd(), "resources", "claude"));
    });

    it("returns resourcesPath in production", () => {
      mockIsPackaged.mockReturnValue(true);
      Object.defineProperty(process, "resourcesPath", {
        value: "/Applications/Windhoox.app/Contents/Resources",
        writable: true,
      });
      const result = getClaudeResourcesPath();
      expect(result).toBe("/Applications/Windhoox.app/Contents/Resources/claude");
    });
  });

  describe("getClaudeAgentsPath", () => {
    it("appends agents to resources path", () => {
      mockIsPackaged.mockReturnValue(false);
      const result = getClaudeAgentsPath();
      expect(result).toBe(path.join(process.cwd(), "resources", "claude", "agents"));
    });
  });

  describe("getClaudeSkillsPath", () => {
    it("appends skills to resources path", () => {
      mockIsPackaged.mockReturnValue(false);
      const result = getClaudeSkillsPath();
      expect(result).toBe(path.join(process.cwd(), "resources", "claude", "skills"));
    });
  });
});
