import { ipcMain, BrowserWindow } from "electron";
import type {
  AnalysisPayload,
  ContinueAnalysisPayload,
  ReviewCasePayload,
  LoadSessionPayload,
  AppConfig,
  AgentEvent,
} from "../types/agent.js";
import { getConfig, setConfig, getConfigMasked } from "./config.js";
import { createClaudeRuntimeFromConfig } from "./claude/runtime/createClaudeRuntime.js";
import { extractResult } from "./claude/runtime/ClaudeResultExtractor.js";
import {
  createRunStartedEvent,
  createReadingSourceEvents,
  resultToAgentEvents,
} from "./claude/runtime/ClaudeEventAdapter.js";
import type { Message } from "@anthropic-ai/sdk/resources/messages.js";
import { ArtifactWriter } from "./storage/ArtifactWriter.js";
import { SessionStore } from "./storage/SessionStore.js";
import type { SessionMetadata } from "./storage/SessionTypes.js";

function sendEvent(mainWindow: BrowserWindow | null, event: AgentEvent): void {
  mainWindow?.webContents.send("agent:event", event);
}

function extractFinalText(message: Message): string {
  return message.content
    .filter((block) => block.type === "text")
    .map((block) => (block as any).text)
    .join("\n");
}

export function registerAgentHandlers(mainWindow: BrowserWindow | null) {
  const artifactWriter = new ArtifactWriter();
  const sessionStore = new SessionStore();

  ipcMain.handle("agent:start-analysis", async (_event, payload: AnalysisPayload) => {
    const sessionId = `session-${Date.now()}`;
    const timestamp = Date.now();

    // 检查配置是否就绪
    const runtime = createClaudeRuntimeFromConfig();
    if (!runtime) {
      sendEvent(mainWindow, {
        type: "run_failed",
        sessionId,
        error: "Claude API 未配置。请在设置中填写 Anthropic API Key。",
        recoverable: true,
        retryEligible: false,
        timestamp,
      });
      return { sessionId };
    }

    // 异步运行分析，通过回调发送事件
    void (async () => {
      try {
        // 1. run_started
        sendEvent(mainWindow, createRunStartedEvent(sessionId, timestamp));

        // 2. reading_sources
        const sources = ["requirement-text", ...(payload.contextReferences || [])];
        const readingEvents = createReadingSourceEvents(sessionId, sources, timestamp + 1);
        readingEvents.forEach((e) => sendEvent(mainWindow, e));

        // 3. 调用 Claude
        const finalMessage = await runtime.startAnalysis({
          requirementText: payload.requirementText,
          contextReferences: payload.contextReferences,
          sessionId,
        });

        // 4. 提取 JSON 结果
        const finalText = extractFinalText(finalMessage);
        const extracted = extractResult(finalText);

        if (!extracted.success) {
          sendEvent(mainWindow, {
            type: "run_failed",
            sessionId,
            error: `结果解析失败: ${extracted.error.message}`,
            recoverable: true,
            retryEligible: true,
            timestamp: Date.now(),
          });
          return;
        }

        // 5. 转换为 AgentEvent 并发送
        const businessEvents = resultToAgentEvents(extracted.data, sessionId);
        businessEvents.forEach((e) => sendEvent(mainWindow, e));

        // 6. 写入 artifacts 到持久化存储
        const allEvents = [
          createRunStartedEvent(sessionId, timestamp),
          ...readingEvents,
          ...businessEvents,
        ];

        const metadata: SessionMetadata = {
          id: sessionId,
          createdAt: timestamp,
          status: "completed",
          requirementText: payload.requirementText,
          model: runtime.getConfig().model,
          totalTokens: finalMessage.usage.input_tokens + finalMessage.usage.output_tokens,
          duration: Date.now() - timestamp,
        };

        const paths = artifactWriter.writeAll(
          sessionId,
          payload.requirementText,
          payload.contextReferences || [],
          allEvents,
          extracted.data,
          finalMessage,
          metadata
        );

        // 7. run_completed with real artifact paths
        sendEvent(mainWindow, {
          type: "run_completed",
          sessionId,
          artifactPaths: {
            conversationPath: paths.conversationPath,
            insightPath: paths.insightPath,
            casesPath: paths.casesPath,
            coveragePath: paths.coveragePath,
          },
          timestamp: Date.now(),
        });
      } catch (error) {
        console.error("Claude analysis error:", error);
        sendEvent(mainWindow, {
          type: "run_failed",
          sessionId,
          error: error instanceof Error ? error.message : "分析运行失败",
          recoverable: true,
          retryEligible: true,
          timestamp: Date.now(),
        });
      }
    })();

    return { sessionId };
  });

  ipcMain.handle("agent:continue-analysis", async (_event, _payload: ContinueAnalysisPayload) => {
    return { success: false, reason: "continue-analysis 尚未支持，将在后续版本实现" };
  });

  ipcMain.handle("agent:review-case", async (_event, _payload: ReviewCasePayload) => {
    return { success: true };
  });

  ipcMain.handle("agent:load-session", async (_event, _payload: LoadSessionPayload) => {
    const session = sessionStore.loadSession(_payload.sessionId);
    if (!session) {
      return { success: false, reason: `Session ${_payload.sessionId} not found` };
    }

    return {
      success: true,
      sessionId: session.metadata.id,
      events: session.events,
      paths: session.paths,
    };
  });

  // Config handlers
  ipcMain.handle("agent:get-config", async () => {
    return getConfigMasked();
  });

  ipcMain.handle("agent:set-config", async (_event, updates: Partial<AppConfig>) => {
    return setConfig(updates);
  });
}
