import Anthropic from "@anthropic-ai/sdk";
import type { Message, MessageParam } from "@anthropic-ai/sdk/resources/messages";
import type {
  ClaudeRuntimeConfig,
  ClaudeAnalysisInput,
  ClaudeRuntimeCallbacks,
  AnalysisSession,
  SessionMetadata,
} from "./types.js";

/**
 * Claude 运行时实现
 * 负责与 Claude API 的通信和会话管理
 */
export class ClaudeRuntime {
  private client: Anthropic;
  private config: ClaudeRuntimeConfig;
  private currentSession: AnalysisSession | null = null;

  constructor(config: ClaudeRuntimeConfig) {
    this.config = config;

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

      // 调用 Claude API
      const response = await this.client.messages.create({
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        system: this.config.systemPrompt,
        messages: [userMessage],
      });

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
   * 继续当前会话（多轮对话）
   */
  async continueConversation(
    userMessage: string,
    callbacks: ClaudeRuntimeCallbacks = {},
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
      // 构建完整的消息历史
      const allMessages: MessageParam[] = [
        ...this.currentSession.messages,
      ];

      const response = await this.client.messages.create({
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        system: this.config.systemPrompt,
        messages: allMessages,
      });

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
