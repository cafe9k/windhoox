import { ClaudeRuntime } from "./ClaudeRuntime.js";
import type { ClaudeRuntimeConfig } from "./types.js";
import { getConfig, isConfigReady } from "../../config.js";

/**
 * 从当前应用配置创建 ClaudeRuntime 实例。
 * 如果配置未就绪（缺少 API key），返回 null。
 */
export function createClaudeRuntimeFromConfig(): ClaudeRuntime | null {
  if (!isConfigReady()) {
    return null;
  }

  const config = getConfig();

  const runtimeConfig: ClaudeRuntimeConfig = {
    apiKey: config.anthropicApiKey,
    baseURL: config.baseURL || undefined,
    model: config.model,
    systemPrompt: config.systemPrompt,
    maxTokens: config.maxTokens,
    temperature: config.temperature,
    enableStructuredOutput: true,
  };

  return new ClaudeRuntime(runtimeConfig);
}
