/**
 * App config management — persistent storage + .env.local fallback.
 *
 * Config is stored in Electron's userData directory as JSON.
 * In development, .env.local values take precedence for convenience.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { app } from "electron";

const _configDirname = path.dirname(fileURLToPath(import.meta.url));

export interface AppConfig {
  anthropicApiKey: string;
  baseURL: string;
  model: string;
  systemPrompt: string;
  maxTokens: number;
  temperature: number;
}

export interface ConfigSource {
  key: "env" | "disk" | "default";
  label: string;
}

export type ConfigWithSources = AppConfig & {
  _sources: Record<keyof AppConfig, ConfigSource>;
};

const DEFAULT_CONFIG: AppConfig = {
  anthropicApiKey: "",
  baseURL: "",
  model: "claude-sonnet-4-5",
  systemPrompt: `You are a senior QA engineer and test architect. Analyze the user's requirements and generate a comprehensive test design in JSON format.

Your output must follow this exact structure:
{
  "insights": [
    {
      "businessRule": "description of the business rule",
      "risk": "potential risk if not tested",
      "evidence": "evidence from requirements",
      "confidence": "high|medium|low"
    }
  ],
  "questions": [
    {
      "id": "q-001",
      "category": "product|engineering|qa",
      "question": "clarification question"
    }
  ],
  "cases": [
    {
      "id": "TC-001",
      "title": "test case title",
      "description": "what this test verifies",
      "preconditions": ["precondition 1"],
      "steps": ["step 1", "step 2"],
      "expectedResult": "expected outcome"
    }
  ],
  "coverage": [
    {
      "requirementId": "req-001",
      "caseIds": ["TC-001", "TC-002"]
    }
  ]
}

Generate thorough test cases covering happy paths, edge cases, error scenarios, and boundary conditions.`,
  maxTokens: 8000,
  temperature: 0.3,
};

let _config: AppConfig | null = null;
let _sources: Record<keyof AppConfig, ConfigSource> | null = null;
let _configDir = "";
let _configPath = "";

function ensurePaths(): void {
  if (_configPath) return;

  try {
    _configDir = app.getPath("userData");
  } catch {
    // Fallback for when app is not ready (tests, etc.)
    _configDir = path.join(process.cwd(), ".windhoox");
  }

  _configPath = path.join(_configDir, "config.json");
}

/**
 * Load .env.local file and extract CLAUDE_API_KEY if present.
 */
function loadEnvLocal(): Partial<AppConfig> {
  const candidates = [
    path.join(process.cwd(), ".env.local"),
    path.join(_configDirname, "../../.env.local"),
  ];

  try {
    candidates.push(path.join(app.getAppPath(), ".env.local"));
  } catch {
    // app not ready yet
  }

  const result: Partial<AppConfig> = {};

  for (const envPath of candidates) {
    try {
      const content = fs.readFileSync(envPath, "utf-8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;

        const eqIdx = trimmed.indexOf("=");
        if (eqIdx === -1) continue;

        const key = trimmed.slice(0, eqIdx).trim();
        const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");

        if (key === "CLAUDE_API_KEY" || key === "DEEPSEEK_API_KEY") {
          result.anthropicApiKey = value;
        } else if (key === "CLAUDE_BASE_URL" || key === "DEEPSEEK_BASE_URL") {
          result.baseURL = value;
        } else if (key === "CLAUDE_MODEL" || key === "DEEPSEEK_MODEL") {
          result.model = value;
        } else if (key === "CLAUDE_SYSTEM_PROMPT") {
          result.systemPrompt = value;
        } else if (key === "CLAUDE_MAX_TOKENS") {
          result.maxTokens = parseInt(value, 10);
        } else if (key === "CLAUDE_TEMPERATURE") {
          result.temperature = parseFloat(value);
        }
      }
      if (result.anthropicApiKey) break;
    } catch {
      // file doesn't exist at this location
    }
  }

  return result;
}

function loadFromDisk(): { config: AppConfig; raw: Partial<AppConfig>; hasFile: boolean } {
  ensurePaths();

  try {
    const content = fs.readFileSync(_configPath, "utf-8");
    const parsed = JSON.parse(content) as Partial<AppConfig>;
    return { config: { ...DEFAULT_CONFIG, ...parsed }, raw: parsed, hasFile: true };
  } catch {
    return { config: { ...DEFAULT_CONFIG }, raw: {}, hasFile: false };
  }
}

function saveToDisk(config: AppConfig): void {
  ensurePaths();

  try {
    if (!fs.existsSync(_configDir)) {
      fs.mkdirSync(_configDir, { recursive: true });
    }
    fs.writeFileSync(_configPath, JSON.stringify(config, null, 2), "utf-8");
  } catch (error) {
    console.error("Failed to save config:", error);
  }
}

function buildSources(
  fromDisk: { raw: Partial<AppConfig>; hasFile: boolean },
  fromEnv: Partial<AppConfig>,
): Record<keyof AppConfig, ConfigSource> {
  const envSource: ConfigSource = { key: "env", label: ".env.local" };
  const diskSource: ConfigSource = { key: "disk", label: "已保存" };
  const defaultSource: ConfigSource = { key: "default", label: "默认值" };

  return {
    anthropicApiKey: fromEnv.anthropicApiKey
      ? envSource
      : (fromDisk.hasFile && "anthropicApiKey" in fromDisk.raw ? diskSource : defaultSource),
    baseURL: fromEnv.baseURL
      ? envSource
      : (fromDisk.hasFile && "baseURL" in fromDisk.raw ? diskSource : defaultSource),
    model: fromEnv.model
      ? envSource
      : (fromDisk.hasFile && "model" in fromDisk.raw ? diskSource : defaultSource),
    systemPrompt: fromEnv.systemPrompt
      ? envSource
      : (fromDisk.hasFile && "systemPrompt" in fromDisk.raw ? diskSource : defaultSource),
    maxTokens: fromEnv.maxTokens
      ? envSource
      : (fromDisk.hasFile && "maxTokens" in fromDisk.raw ? diskSource : defaultSource),
    temperature: fromEnv.temperature
      ? envSource
      : (fromDisk.hasFile && "temperature" in fromDisk.raw ? diskSource : defaultSource),
  };
}

/**
 * Get current app config.
 * Priority: .env.local (dev) > persisted config > defaults
 */
export function getConfig(): AppConfig {
  if (_config) return _config;

  const { config: fromDisk } = loadFromDisk();
  const fromEnv = loadEnvLocal();

  _config = {
    ...DEFAULT_CONFIG,
    ...fromDisk,
    ...fromEnv,
  };

  _sources = buildSources(loadFromDisk(), fromEnv);

  return _config;
}

/**
 * Get config with source tracking for each field.
 */
export function getConfigWithSources(): ConfigWithSources {
  const config = getConfig();
  return {
    ...config,
    _sources: _sources || buildSources(loadFromDisk(), loadEnvLocal()),
  };
}

/**
 * Update app config and persist to disk.
 * Note: .env.local values will still take precedence on next load in dev mode.
 */
export function setConfig(updates: Partial<AppConfig>): AppConfig {
  const current = getConfig();
  _config = { ...current, ...updates };
  saveToDisk(_config);
  _sources = null;
  _config = null;
  return getConfig();
}

/**
 * Get config with API key masked (for UI display).
 * Includes source information.
 */
export function getConfigMasked(): Omit<ConfigWithSources, "anthropicApiKey"> & { anthropicApiKey: string } {
  const config = getConfigWithSources();
  const key = config.anthropicApiKey;
  const masked = key ? `${key.slice(0, 4)}****${key.slice(-4)}` : "";
  return { ...config, anthropicApiKey: masked };
}

/**
 * Check if config is ready for API calls.
 */
export function isConfigReady(): boolean {
  const config = getConfig();
  return Boolean(config.anthropicApiKey && config.model);
}

/**
 * Reset internal config cache. Used in tests to ensure clean state.
 */
export function resetConfigCache(): void {
  _config = null;
  _sources = null;
  _configPath = "";
  _configDir = "";
}
