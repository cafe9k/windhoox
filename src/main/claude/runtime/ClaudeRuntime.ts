import Anthropic from "@anthropic-ai/sdk";
import type { Message, MessageParam } from "@anthropic-ai/sdk/resources/messages";
import type {
  ClaudeRuntimeConfig,
  ClaudeAnalysisInput,
  ClaudeRuntimeCallbacks,
  AnalysisSession,
  SessionMetadata,
} from "./types.js";
import { windhooxAgentResultSchema } from "../../schemas/windhooxAgentResult.js";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod.js";

/** JSON Schema for structured output, derived from windhooxAgentResultSchema. */
const structuredOutputFormat = zodOutputFormat(windhooxAgentResultSchema);

/**
 * Check if the configured endpoint is an OpenAI-compatible API (e.g. DeepSeek)
 * rather than the native Anthropic Messages API.
 */
function isOpenAICompatible(baseURL: string | undefined): boolean {
  if (!baseURL) return false;
  const url = baseURL.toLowerCase();
  return url.includes("deepseek") || url.includes("openai") || url.includes("gpt");
}

/**
 * Build a Message-shaped object from an OpenAI-compatible chat completion response.
 */
function wrapOpenAIResponse(
  json: Record<string, unknown>,
  model: string,
): Message {
  const choice = (json.choices as any[])[0];
  const content = choice?.message?.content ?? "";
  const usage = (json.usage as Record<string, number>) || {};
  return {
    id: (json.id as string) || "openai-response",
    type: "message",
    role: "assistant",
    model,
    content: [{ type: "text", text: content }],
    usage: {
      input_tokens: usage.prompt_tokens ?? 0,
      output_tokens: usage.completion_tokens ?? 0,
    },
    stop_reason: choice?.finish_reason === "stop" ? "end_turn" : null,
    stop_sequence: null,
  } as unknown as Message;
}

/**
 * Call an OpenAI-compatible chat completions endpoint via fetch.
 */
async function callOpenAIChatCompletion(
  baseURL: string,
  apiKey: string,
  body: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<Record<string, unknown>> {
  const url = baseURL.replace(/\/$/, "") + "/chat/completions";
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`OpenAI-compatible API error: ${response.status} ${response.statusText}${text ? " - " + text : ""}`);
  }

  return response.json() as Promise<Record<string, unknown>>;
}

/**
 * Claude 运行时实现
 * 负责与 Claude API 的通信和会话管理
 * 同时支持 OpenAI-compatible 端点（如 DeepSeek）的适配调用。
 */
export class ClaudeRuntime {
  private client: Anthropic;
  private config: ClaudeRuntimeConfig;
  private currentSession: AnalysisSession | null = null;
  private useOpenAICompat: boolean;

  constructor(config: ClaudeRuntimeConfig) {
    this.config = config;
    this.useOpenAICompat = isOpenAICompatible(config.baseURL);

    if (this.useOpenAICompat) {
      // No Anthropic client needed for OpenAI-compatible endpoints
      this.client = null as unknown as Anthropic;
      return;
    }

    // 清理可能干扰的环境变量（如 Claude Desktop 设置的 ANTHROPIC_AUTH_TOKEN）
    const originalAuthToken = process.env.ANTHROPIC_AUTH_TOKEN;
    const originalApiKey = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_AUTH_TOKEN;
    delete process.env.ANTHROPIC_API_KEY;

    this.client = new Anthropic({
      apiKey: config.apiKey,
      ...(config.baseURL ? { baseURL: config.baseURL } : {}),
    });

    // 恢复环境变量
    if (originalAuthToken !== undefined) {
      process.env.ANTHROPIC_AUTH_TOKEN = originalAuthToken;
    }
    if (originalApiKey !== undefined) {
      process.env.ANTHROPIC_API_KEY = originalApiKey;
    }
  }

  /**
   * 创建新的分析会话
   */
  async startAnalysis(
    input: ClaudeAnalysisInput,
    callbacks: ClaudeRuntimeCallbacks = {},
    signal?: AbortSignal,
  ): Promise<Message> {
    const metadata: SessionMetadata = {
      sessionId: input.sessionId,
      startTime: Date.now(),
      status: "running",
      model: this.config.model,
    };

    this.currentSession = {
      metadata,
      messages: [],
      assistantMessages: [],
      toolCalls: [],
      errors: [],
    };

    try {
      // 构建初始消息
      const userMessage: MessageParam = {
        role: "user",
        content: input.requirementText,
      };

      this.currentSession.messages.push(userMessage);
      callbacks.onMessage?.(userMessage);

      let response: Message;

      if (this.useOpenAICompat) {
        response = await this.startAnalysisOpenAICompat(userMessage, signal);
      } else if (this.config.enableStreaming) {
        // Streaming mode — use messages.stream()
        const baseParams = {
          model: this.config.model,
          max_tokens: this.config.maxTokens,
          temperature: this.config.temperature,
          system: this.config.systemPrompt,
          messages: [userMessage] as MessageParam[],
        };
        response = await this.startAnalysisStreaming(baseParams, callbacks, signal);
      } else if (this.config.enableStructuredOutput) {
        // Structured output mode — use messages.parse()
        const baseParams = {
          model: this.config.model,
          max_tokens: this.config.maxTokens,
          temperature: this.config.temperature,
          system: this.config.systemPrompt,
          messages: [userMessage] as MessageParam[],
        };
        const parsedResponse = await this.client.messages.parse({
          ...baseParams,
          output_config: {
            format: structuredOutputFormat,
          },
        }, { signal });
        response = parsedResponse as unknown as Message;
      } else {
        // Standard synchronous API call
        const baseParams = {
          model: this.config.model,
          max_tokens: this.config.maxTokens,
          temperature: this.config.temperature,
          system: this.config.systemPrompt,
          messages: [userMessage] as MessageParam[],
        };
        response = await this.client.messages.create(baseParams, { signal });
      }

      // 记录响应
      this.currentSession.assistantMessages.push(response);
      callbacks.onAssistantMessage?.(response);

      // 更新元数据
      this.currentSession.metadata.status = "completed";
      this.currentSession.metadata.endTime = Date.now();
      this.currentSession.metadata.totalTokens = response.usage.input_tokens + response.usage.output_tokens;

      // 完成回调
      callbacks.onComplete?.(response);

      return response;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      this.currentSession.metadata.status = "failed";
      this.currentSession.metadata.endTime = Date.now();
      this.currentSession.errors.push(err);

      callbacks.onError?.(err);
      throw err;
    }
  }

  /**
   * OpenAI-compatible analysis (DeepSeek, etc.) using fetch.
   */
  private async startAnalysisOpenAICompat(
    userMessage: MessageParam,
    signal?: AbortSignal,
  ): Promise<Message> {
    const messages = [
      { role: "system", content: this.config.systemPrompt },
      { role: "user", content: String(userMessage.content) },
    ];

    const body: Record<string, unknown> = {
      model: this.config.model,
      messages,
      max_tokens: this.config.maxTokens,
      temperature: this.config.temperature,
    };

    // DeepSeek reasoner models don't support temperature
    if (this.config.model.includes("reasoner")) {
      delete body.temperature;
    }

    const json = await callOpenAIChatCompletion(
      this.config.baseURL!,
      this.config.apiKey,
      body,
      signal,
    );

    return wrapOpenAIResponse(json, this.config.model);
  }

  /**
   * 流式分析 — 使用 messages.stream() API
   * 支持 AbortSignal，逐步转发 text delta 和 JSON delta 事件。
   */
  private async startAnalysisStreaming(
    baseParams: Record<string, unknown>,
    callbacks: ClaudeRuntimeCallbacks,
    signal?: AbortSignal,
  ): Promise<Message> {
    const streamParams: Record<string, unknown> = {
      ...baseParams,
    };

    // If structured output is also enabled, include output_config in stream
    if (this.config.enableStructuredOutput) {
      streamParams.output_config = {
        format: structuredOutputFormat,
      };
    }

    const stream = this.client.messages.stream(
      streamParams as any,
      { signal },
    );

    // Forward text deltas if callback provided
    if (callbacks.onTextDelta) {
      stream.on("text", (textDelta: string, textSnapshot: string) => {
        callbacks.onTextDelta!(textDelta, textSnapshot);
      });
    }

    // Wait for the final message
    const finalMessage = await stream.finalMessage();
    return finalMessage as unknown as Message;
  }

  /**
   * 继续当前会话（多轮对话）
   */
  async continueConversation(
    userMessage: string,
    callbacks: ClaudeRuntimeCallbacks = {},
    signal?: AbortSignal,
  ): Promise<Message> {
    if (!this.currentSession) {
      throw new Error("No active session. Call startAnalysis first.");
    }

    const messageParam: MessageParam = {
      role: "user",
      content: userMessage,
    };

    this.currentSession.messages.push(messageParam);
    callbacks.onMessage?.(messageParam);

    try {
      let response: Message;

      if (this.useOpenAICompat) {
        const messages = [
          { role: "system", content: this.config.systemPrompt },
          ...this.currentSession.messages.map((m) => ({
            role: m.role,
            content: String(m.content),
          })),
        ];

        const body: Record<string, unknown> = {
          model: this.config.model,
          messages,
          max_tokens: this.config.maxTokens,
          temperature: this.config.temperature,
        };

        if (this.config.model.includes("reasoner")) {
          delete body.temperature;
        }

        const json = await callOpenAIChatCompletion(
          this.config.baseURL!,
          this.config.apiKey,
          body,
          signal,
        );

        response = wrapOpenAIResponse(json, this.config.model);
      } else {
        // 构建完整的消息历史
        const allMessages: MessageParam[] = [
          ...this.currentSession.messages,
        ];

        response = await this.client.messages.create({
          model: this.config.model,
          max_tokens: this.config.maxTokens,
          temperature: this.config.temperature,
          system: this.config.systemPrompt,
          messages: allMessages,
        }, { signal });
      }

      this.currentSession.assistantMessages.push(response);
      callbacks.onAssistantMessage?.(response);

      // 更新 token 计数
      this.currentSession.metadata.totalTokens =
        (this.currentSession.metadata.totalTokens || 0) +
        response.usage.input_tokens +
        response.usage.output_tokens;

      callbacks.onComplete?.(response);

      return response;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.currentSession.errors.push(err);
      callbacks.onError?.(err);
      throw err;
    }
  }

  /**
   * 获取当前会话信息
   */
  getCurrentSession(): AnalysisSession | null {
    return this.currentSession;
  }

  /**
   * 重置会话
   */
  resetSession(): void {
    this.currentSession = null;
  }

  /**
   * 更新运行时配置
   */
  updateConfig(newConfig: Partial<ClaudeRuntimeConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // 如果 API key 或 baseURL 更新，重新创建客户端
    if (newConfig.apiKey || newConfig.baseURL) {
      // 清理可能干扰的环境变量
      const originalAuthToken = process.env.ANTHROPIC_AUTH_TOKEN;
      const originalApiKey = process.env.ANTHROPIC_API_KEY;
      delete process.env.ANTHROPIC_AUTH_TOKEN;
      delete process.env.ANTHROPIC_API_KEY;

      this.client = new Anthropic({
        apiKey: this.config.apiKey,
        ...(this.config.baseURL ? { baseURL: this.config.baseURL } : {}),
      });

      // 恢复环境变量
      if (originalAuthToken !== undefined) {
        process.env.ANTHROPIC_AUTH_TOKEN = originalAuthToken;
      }
      if (originalApiKey !== undefined) {
        process.env.ANTHROPIC_API_KEY = originalApiKey;
      }
    }
  }

  /**
   * 获取当前配置
   */
  getConfig(): ClaudeRuntimeConfig {
    return { ...this.config };
  }
}
