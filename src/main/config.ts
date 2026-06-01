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
  deepseekApiKey: string;
  deepseekBaseUrl: string;
  deepseekModel: string;
}

export interface ConfigSource {
  key: "env" | "disk" | "default";
  label: string;
}

export type ConfigWithSources = AppConfig & {
  _sources: Record<keyof AppConfig, ConfigSource>;
};

const DEFAULT_CONFIG: AppConfig = {
  deepseekApiKey: "",
  deepseekBaseUrl: "https://api.deepseek.com",
  deepseekModel: "deepseek-reasoner",
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
 * Load .env.local file and extract DEEPSEEK_API_KEY if present.
 */
function loadEnvLocal(): Partial<AppConfig> {
  // Try multiple locations: cwd (for CLI/scripts), relative to this file (for Electron),
  // and app root (for packaged Electron)
  const candidates = [
    path.join(process.cwd(), ".env.local"),
    path.join(_configDirname, "../../.env.local"),
  ];

  // In Electron, also try app path
  try {
    candidates.push(path.join(app.getAppPath(), ".env.local"));
  } catch {
    // app not ready yet — skip
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

        if (key === "DEEPSEEK_API_KEY") {
          result.deepseekApiKey = value;
        } else if (key === "DEEPSEEK_BASE_URL") {
          result.deepseekBaseUrl = value;
        } else if (key === "DEEPSEEK_MODEL") {
          result.deepseekModel = value;
        }
      }
      // Found and parsed — stop here
      if (result.deepseekApiKey) break;
    } catch {
      // File doesn't exist at this location — try next
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
    deepseekApiKey: fromEnv.deepseekApiKey
      ? envSource
      : (fromDisk.hasFile && "deepseekApiKey" in fromDisk.raw ? diskSource : defaultSource),
    deepseekBaseUrl: fromEnv.deepseekBaseUrl
      ? envSource
      : (fromDisk.hasFile && "deepseekBaseUrl" in fromDisk.raw ? diskSource : defaultSource),
    deepseekModel: fromEnv.deepseekModel
      ? envSource
      : (fromDisk.hasFile && "deepseekModel" in fromDisk.raw ? diskSource : defaultSource),
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

  // .env.local takes precedence in development
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
  // Reset sources so next load recalculates
  _sources = null;
  _config = null;
  return getConfig();
}

/**
 * Get config with API key masked (for UI display).
 * Includes source information.
 */
export function getConfigMasked(): Omit<ConfigWithSources, "deepseekApiKey"> & { deepseekApiKey: string } {
  const config = getConfigWithSources();
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

/**
 * Reset internal config cache. Used in tests to ensure clean state.
 */
export function resetConfigCache(): void {
  _config = null;
  _sources = null;
  _configPath = "";
  _configDir = "";
}
