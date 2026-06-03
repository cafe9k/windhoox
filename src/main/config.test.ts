import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

// Mock Electron app before importing config
const mockUserData = path.join(os.tmpdir(), "windhoox-test-" + Date.now());
vi.mock("electron", () => ({
  app: {
    getPath: vi.fn(() => mockUserData),
  },
}));

// Must import after mock
const {
  getConfig,
  setConfig,
  getConfigWithSources,
  getConfigMasked,
  isConfigReady,
  resetConfigCache,
} = await import("./config.js");

describe("config", () => {
  const envLocalPath = path.join(process.cwd(), ".env.local");
  const configPath = path.join(mockUserData, "config.json");
  let originalEnvContent: string | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    resetConfigCache();
    fs.rmSync(configPath, { force: true });
    fs.rmSync(envLocalPath, { force: true });
  });

  afterEach(() => {
    fs.rmSync(configPath, { force: true });
    fs.rmSync(envLocalPath, { force: true });
    try { fs.rmdirSync(mockUserData, { recursive: true }); } catch { /* ignore */ }
  });

  function writeEnvLocal(content: string) {
    fs.writeFileSync(envLocalPath, content, "utf-8");
  }

  function writeConfigFile(config: Record<string, unknown>) {
    fs.mkdirSync(mockUserData, { recursive: true });
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");
  }

  describe("loadEnvLocal", () => {
    it("returns empty object when .env.local does not exist", () => {
      const config = getConfig();
      expect(config.anthropicApiKey).toBe("");
    });

    it("reads CLAUDE_API_KEY from .env.local", () => {
      writeEnvLocal("CLAUDE_API_KEY=sk-ant-test-key-123\n");
      const config = getConfig();
      expect(config.anthropicApiKey).toBe("sk-ant-test-key-123");
    });

    it("reads CLAUDE_MODEL from .env.local", () => {
      writeEnvLocal("CLAUDE_MODEL=claude-sonnet-4-5\n");
      const config = getConfig();
      expect(config.model).toBe("claude-sonnet-4-5");
    });

    it("reads CLAUDE_BASE_URL from .env.local", () => {
      writeEnvLocal("CLAUDE_API_KEY=sk-test\nCLAUDE_BASE_URL=https://api.deepseek.com/anthropic\n");
      const config = getConfig();
      expect(config.baseURL).toBe("https://api.deepseek.com/anthropic");
    });

    it("ignores comments and empty lines", () => {
      writeEnvLocal(`# This is a comment
CLAUDE_API_KEY=sk-ant-valid

# Another comment
CLAUDE_MODEL=claude-sonnet-4-5
`);
      const config = getConfig();
      expect(config.anthropicApiKey).toBe("sk-ant-valid");
      expect(config.model).toBe("claude-sonnet-4-5");
    });

    it("strips surrounding quotes from values", () => {
      writeEnvLocal('CLAUDE_API_KEY="sk-ant-quoted-key"\n');
      const config = getConfig();
      expect(config.anthropicApiKey).toBe("sk-ant-quoted-key");
    });

    it("ignores unrelated env vars", () => {
      writeEnvLocal("OTHER_VAR=value\nCLAUDE_API_KEY=sk-ant-key\nFOO=bar\n");
      const config = getConfig();
      expect(config.anthropicApiKey).toBe("sk-ant-key");
    });

    it("ignores old DeepSeek env variables", () => {
      writeEnvLocal("DEEPSEEK_API_KEY=sk-deepseek\nDEEPSEEK_BASE_URL=https://deepseek.com\n");
      const config = getConfig();
      expect(config.anthropicApiKey).toBe("");
    });
  });

  describe("config priority", () => {
    it("uses defaults when no config exists", () => {
      const config = getConfig();
      expect(config.anthropicApiKey).toBe("");
      expect(config.baseURL).toBe("");
      expect(config.model).toBe("claude-sonnet-4-5");
      expect(config.systemPrompt).toContain("QA engineer");
      expect(config.maxTokens).toBe(8000);
      expect(config.temperature).toBe(0.3);
    });

    it("persisted config overrides defaults", () => {
      writeConfigFile({ anthropicApiKey: "sk-ant-persisted", model: "claude-opus-4-5" });
      const config = getConfig();
      expect(config.anthropicApiKey).toBe("sk-ant-persisted");
      expect(config.model).toBe("claude-opus-4-5");
      expect(config.maxTokens).toBe(8000); // default
    });

    it("env variables take precedence over persisted config", () => {
      writeConfigFile({ anthropicApiKey: "sk-ant-persisted", model: "claude-opus-4-5" });
      writeEnvLocal("CLAUDE_API_KEY=sk-ant-from-env\n");
      const config = getConfig();
      expect(config.anthropicApiKey).toBe("sk-ant-from-env");
      expect(config.model).toBe("claude-opus-4-5"); // from persisted
    });
  });

  describe("getConfigWithSources", () => {
    it("marks env-sourced fields correctly", () => {
      writeEnvLocal("CLAUDE_API_KEY=sk-ant-env-key\n");
      writeConfigFile({ anthropicApiKey: "sk-ant-persisted" });
      const config = getConfigWithSources();
      expect(config._sources.anthropicApiKey.key).toBe("env");
      expect(config._sources.anthropicApiKey.label).toBe(".env.local");
    });

    it("marks disk-sourced fields correctly", () => {
      writeConfigFile({ anthropicApiKey: "sk-ant-persisted" });
      const config = getConfigWithSources();
      expect(config._sources.anthropicApiKey.key).toBe("disk");
      expect(config._sources.anthropicApiKey.label).toBe("已保存");
    });

    it("marks default fields correctly", () => {
      const config = getConfigWithSources();
      expect(config._sources.anthropicApiKey.key).toBe("default");
      expect(config._sources.model.key).toBe("default");
    });

    it("tracks source per field independently", () => {
      writeEnvLocal("CLAUDE_API_KEY=sk-ant-env\n");
      writeConfigFile({ model: "claude-opus-4-5" });
      const config = getConfigWithSources();
      expect(config._sources.anthropicApiKey.key).toBe("env");
      expect(config._sources.model.key).toBe("disk");
      expect(config._sources.systemPrompt.key).toBe("default");
    });
  });

  describe("setConfig", () => {
    it("saves config to disk", () => {
      setConfig({ anthropicApiKey: "sk-ant-new", model: "claude-sonnet-4-5" });
      expect(fs.existsSync(configPath)).toBe(true);
      const saved = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      expect(saved.anthropicApiKey).toBe("sk-ant-new");
      expect(saved.model).toBe("claude-sonnet-4-5");
    });

    it("preserves existing fields when partially updating", () => {
      setConfig({ anthropicApiKey: "sk-ant-first", model: "claude-opus-4-5" });
      setConfig({ anthropicApiKey: "sk-ant-second" });
      const saved = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      expect(saved.anthropicApiKey).toBe("sk-ant-second");
      expect(saved.model).toBe("claude-opus-4-5");
    });

    it("returns updated config", () => {
      const result = setConfig({ anthropicApiKey: "sk-ant-test" });
      expect(result.anthropicApiKey).toBe("sk-ant-test");
      expect(result.model).toBe("claude-sonnet-4-5");
    });

    it("saves baseURL to disk", () => {
      setConfig({ anthropicApiKey: "sk-ant-new", baseURL: "https://api.deepseek.com/anthropic" });
      const saved = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      expect(saved.baseURL).toBe("https://api.deepseek.com/anthropic");
    });

    it("does not write deepseek fields", () => {
      setConfig({ anthropicApiKey: "sk-ant-test" });
      const saved = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      expect(saved).not.toHaveProperty("deepseekApiKey");
      expect(saved).not.toHaveProperty("deepseekBaseUrl");
      expect(saved).not.toHaveProperty("deepseekModel");
    });
  });

  describe("getConfigMasked", () => {
    it("masks API key with first 4 and last 4 chars", () => {
      writeConfigFile({ anthropicApiKey: "sk-ant-abcdefghijklmnopqrstuvwxyz" });
      const masked = getConfigMasked();
      expect(masked.anthropicApiKey).toBe("sk-a****wxyz");
    });

    it("returns empty string when no key is set", () => {
      const masked = getConfigMasked();
      expect(masked.anthropicApiKey).toBe("");
    });

    it("includes source information", () => {
      writeConfigFile({ anthropicApiKey: "sk-ant-test" });
      const masked = getConfigMasked();
      expect(masked._sources).toBeDefined();
      expect(masked._sources.anthropicApiKey.key).toBe("disk");
    });
  });

  describe("isConfigReady", () => {
    it("returns false when API key is empty", () => {
      expect(isConfigReady()).toBe(false);
    });

    it("returns false when model is empty", () => {
      writeConfigFile({ anthropicApiKey: "sk-ant-test", model: "" });
      expect(isConfigReady()).toBe(false);
    });

    it("returns true when both key and model are set", () => {
      writeConfigFile({ anthropicApiKey: "sk-ant-test", model: "claude-sonnet-4-5" });
      expect(isConfigReady()).toBe(true);
    });
  });
});
