/**
 * App config management — persistent storage + .env.local fallback.
 *
 * Config is stored in Electron's userData directory as JSON.
 * In development, .env.local values take precedence for convenience.
 */

import fs from "node:fs";
import path from "node:path";
import { app } from "electron";

export interface AppConfig {
  deepseekApiKey: string;
  deepseekBaseUrl: string;
  deepseekModel: string;
}

const DEFAULT_CONFIG: AppConfig = {
  deepseekApiKey: "",
  deepseekBaseUrl: "https://api.deepseek.com",
  deepseekModel: "deepseek-reasoner",
};

let _config: AppConfig | null = null;
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
 * Load .env.local file and extract DEEPSEEK_API_KEY if present.
 */
function loadEnvLocal(): Partial<AppConfig> {
  const envPath = path.join(process.cwd(), ".env.local");
  const result: Partial<AppConfig> = {};

  try {
    const content = fs.readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;

      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;

      const key = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");

      if (key === "DEEPSEEK_API_KEY") {
        result.deepseekApiKey = value;
      } else if (key === "DEEPSEEK_BASE_URL") {
        result.deepseekBaseUrl = value;
      } else if (key === "DEEPSEEK_MODEL") {
        result.deepseekModel = value;
      }
    }
  } catch {
    // .env.local doesn't exist — that's fine
  }

  return result;
}

function loadFromDisk(): AppConfig {
  ensurePaths();

  try {
    const content = fs.readFileSync(_configPath, "utf-8");
    const parsed = JSON.parse(content) as Partial<AppConfig>;
    return { ...DEFAULT_CONFIG, ...parsed };
  } catch {
    return { ...DEFAULT_CONFIG };
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

/**
 * Get current app config.
 * Priority: .env.local (dev) > persisted config > defaults
 */
export function getConfig(): AppConfig {
  if (_config) return _config;

  const fromDisk = loadFromDisk();
  const fromEnv = loadEnvLocal();

  // .env.local takes precedence in development
  _config = {
    ...DEFAULT_CONFIG,
    ...fromDisk,
    ...fromEnv,
  };

  return _config;
}

/**
 * Update app config and persist to disk.
 * Note: .env.local values will still take precedence on next load in dev mode.
 */
export function setConfig(updates: Partial<AppConfig>): AppConfig {
  const current = getConfig();
  _config = { ...current, ...updates };
  saveToDisk(_config);
  return _config;
}

/**
 * Get config with API key masked (for UI display).
 */
export function getConfigMasked(): Omit<AppConfig, "deepseekApiKey"> & { deepseekApiKey: string } {
  const config = getConfig();
  const key = config.deepseekApiKey;
  const masked = key ? `${key.slice(0, 4)}****${key.slice(-4)}` : "";
  return { ...config, deepseekApiKey: masked };
}

/**
 * Check if config is ready for API calls.
 */
export function isConfigReady(): boolean {
  const config = getConfig();
  return Boolean(config.deepseekApiKey && config.deepseekBaseUrl);
}
