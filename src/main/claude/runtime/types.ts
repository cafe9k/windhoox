import type { Message, MessageParam } from "@anthropic-ai/sdk/resources/messages";

/**
 * Claude 分析输入参数
 */
export interface ClaudeAnalysisInput {
  requirementText: string;
  contextReferences?: string[];
  sessionId: string;
}

/**
 * Claude 运行时事件回调
 */
export interface ClaudeRuntimeCallbacks {
  onMessage?: (message: MessageParam) => void;
  onAssistantMessage?: (message: Message) => void;
  onError?: (error: Error) => void;
  onComplete?: (finalMessage: Message) => void;
}

/**
 * Claude 运行时配置
 */
export interface ClaudeRuntimeConfig {
  apiKey: string;
  baseURL?: string;
  model: string;
  systemPrompt: string;
  maxTokens: number;
  temperature: number;
  enableToolUse?: boolean;
}

/**
 * 分析结果状态
 */
export type AnalysisStatus = "idle" | "running" | "completed" | "failed";

/**
 * 分析会话元数据
 */
export interface SessionMetadata {
  sessionId: string;
  startTime: number;
  endTime?: number;
  status: AnalysisStatus;
  model: string;
  totalTokens?: number;
}

/**
 * 工具调用记录
 */
export interface ToolCallRecord {
  toolName: string;
  input: Record<string, unknown>;
  output?: unknown;
  timestamp: number;
  duration?: number;
}

/**
 * 完整分析会话记录
 */
export interface AnalysisSession {
  metadata: SessionMetadata;
  messages: MessageParam[];
  assistantMessages: Message[];
  toolCalls: ToolCallRecord[];
  errors: Error[];
}
