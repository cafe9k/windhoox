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
} = await import("./config");

describe("config", () => {
  const envLocalPath = path.join(process.cwd(), ".env.local");
  const configPath = path.join(mockUserData, "config.json");
  let originalEnvContent: string | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset module-level config cache
    resetConfigCache();
    // Clean up test files — force: true avoids ENOENT errors
    fs.rmSync(configPath, { force: true });
    fs.rmSync(envLocalPath, { force: true });
  });

  afterEach(() => {
    // Clean up test files
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
      // .env.local cleaned up in beforeEach
      const config = getConfig();
      expect(config.deepseekApiKey).toBe("");
    });

    it("reads DEEPSEEK_API_KEY from .env.local", () => {
      writeEnvLocal("DEEPSEEK_API_KEY=sk-test-key-123\n");
      const config = getConfig();
      expect(config.deepseekApiKey).toBe("sk-test-key-123");
    });

    it("reads all three env variables", () => {
      writeEnvLocal(
        "DEEPSEEK_API_KEY=sk-key\nDEEPSEEK_BASE_URL=https://custom.api.com\nDEEPSEEK_MODEL=deepseek-chat\n",
      );
      const config = getConfig();
      expect(config.deepseekApiKey).toBe("sk-key");
      expect(config.deepseekBaseUrl).toBe("https://custom.api.com");
      expect(config.deepseekModel).toBe("deepseek-chat");
    });

    it("ignores comments and empty lines", () => {
      writeEnvLocal(`# This is a comment
DEEPSEEK_API_KEY=sk-valid

# Another comment
DEEPSEEK_MODEL=deepseek-chat
`);
      const config = getConfig();
      expect(config.deepseekApiKey).toBe("sk-valid");
      expect(config.deepseekModel).toBe("deepseek-chat");
    });

    it("strips surrounding quotes from values", () => {
      writeEnvLocal('DEEPSEEK_API_KEY="sk-quoted-key"\n');
      const config = getConfig();
      expect(config.deepseekApiKey).toBe("sk-quoted-key");
    });

    it("ignores unrelated env vars", () => {
      writeEnvLocal("OTHER_VAR=value\nDEEPSEEK_API_KEY=sk-key\nFOO=bar\n");
      const config = getConfig();
      expect(config.deepseekApiKey).toBe("sk-key");
    });
  });

  describe("config priority", () => {
    it("uses defaults when no config exists", () => {
      const config = getConfig();
      expect(config.deepseekApiKey).toBe("");
      expect(config.deepseekBaseUrl).toBe("https://api.deepseek.com");
      expect(config.deepseekModel).toBe("deepseek-reasoner");
    });

    it("persisted config overrides defaults", () => {
      writeConfigFile({ deepseekApiKey: "sk-persisted", deepseekModel: "deepseek-chat" });
      const config = getConfig();
      expect(config.deepseekApiKey).toBe("sk-persisted");
      expect(config.deepseekModel).toBe("deepseek-chat");
      expect(config.deepseekBaseUrl).toBe("https://api.deepseek.com"); // default
    });

    it("env variables take precedence over persisted config", () => {
      writeConfigFile({ deepseekApiKey: "sk-persisted", deepseekModel: "deepseek-chat" });
      writeEnvLocal("DEEPSEEK_API_KEY=sk-from-env\n");
      const config = getConfig();
      expect(config.deepseekApiKey).toBe("sk-from-env");
      expect(config.deepseekModel).toBe("deepseek-chat"); // from persisted
    });
  });

  describe("getConfigWithSources", () => {
    it("marks env-sourced fields correctly", () => {
      writeEnvLocal("DEEPSEEK_API_KEY=sk-env-key\n");
      writeConfigFile({ deepseekApiKey: "sk-persisted" }); // env should win
      const config = getConfigWithSources();
      expect(config._sources.deepseekApiKey.key).toBe("env");
      expect(config._sources.deepseekApiKey.label).toBe(".env.local");
    });

    it("marks disk-sourced fields correctly", () => {
      writeConfigFile({ deepseekApiKey: "sk-persisted" });
      const config = getConfigWithSources();
      expect(config._sources.deepseekApiKey.key).toBe("disk");
      expect(config._sources.deepseekApiKey.label).toBe("已保存");
    });

    it("marks default fields correctly", () => {
      // No env, no persisted config
      const config = getConfigWithSources();
      expect(config._sources.deepseekApiKey.key).toBe("default");
      expect(config._sources.deepseekBaseUrl.key).toBe("default");
    });

    it("tracks source per field independently", () => {
      writeEnvLocal("DEEPSEEK_API_KEY=sk-env\n");
      writeConfigFile({ deepseekBaseUrl: "https://custom.com" });
      const config = getConfigWithSources();
      expect(config._sources.deepseekApiKey.key).toBe("env");
      expect(config._sources.deepseekBaseUrl.key).toBe("disk");
      expect(config._sources.deepseekModel.key).toBe("default");
    });
  });

  describe("setConfig", () => {
    it("saves config to disk", () => {
      setConfig({ deepseekApiKey: "sk-new", deepseekBaseUrl: "https://new.com" });
      expect(fs.existsSync(configPath)).toBe(true);
      const saved = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      expect(saved.deepseekApiKey).toBe("sk-new");
      expect(saved.deepseekBaseUrl).toBe("https://new.com");
    });

    it("preserves existing fields when partially updating", () => {
      setConfig({ deepseekApiKey: "sk-first", deepseekModel: "deepseek-chat" });
      setConfig({ deepseekApiKey: "sk-second" });
      const saved = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      expect(saved.deepseekApiKey).toBe("sk-second");
      expect(saved.deepseekModel).toBe("deepseek-chat");
    });

    it("returns updated config", () => {
      const result = setConfig({ deepseekApiKey: "sk-test" });
      expect(result.deepseekApiKey).toBe("sk-test");
      expect(result.deepseekBaseUrl).toBe("https://api.deepseek.com");
    });
  });

  describe("getConfigMasked", () => {
    it("masks API key with first 4 and last 4 chars", () => {
      writeConfigFile({ deepseekApiKey: "sk-abcdefghijklmnopqrstuvwxyz" });
      const masked = getConfigMasked();
      expect(masked.deepseekApiKey).toBe("sk-a****wxyz");
    });

    it("returns empty string when no key is set", () => {
      const masked = getConfigMasked();
      expect(masked.deepseekApiKey).toBe("");
    });

    it("includes source information", () => {
      writeConfigFile({ deepseekApiKey: "sk-test" });
      const masked = getConfigMasked();
      expect(masked._sources).toBeDefined();
      expect(masked._sources.deepseekApiKey.key).toBe("disk");
    });
  });

  describe("isConfigReady", () => {
    it("returns false when API key is empty", () => {
      expect(isConfigReady()).toBe(false);
    });

    it("returns false when baseUrl is empty", () => {
      writeConfigFile({ deepseekApiKey: "sk-test", deepseekBaseUrl: "" });
      expect(isConfigReady()).toBe(false);
    });

    it("returns true when both key and baseUrl are set", () => {
      writeConfigFile({ deepseekApiKey: "sk-test", deepseekBaseUrl: "https://api.deepseek.com" });
      expect(isConfigReady()).toBe(true);
    });
  });
});
