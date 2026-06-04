import { ipcMain, BrowserWindow } from "electron";
import { randomUUID } from "node:crypto";
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
import { ClaudeAgentRuntime } from "./claude/ClaudeAgentRuntime.js";
import type { AgentRuntime } from "./agent-runtime/types.js";
import { SessionStore } from "./storage/SessionStore.js";

function sendEvent(mainWindow: BrowserWindow | null, event: AgentEvent): void {
  mainWindow?.webContents.send("agent:event", event);
}

/**
 * Create an AgentRuntime instance from the current config.
 * Returns null if the config is not ready (e.g., missing API key).
 */
function createAgentRuntime(): AgentRuntime | null {
  const claudeRuntime = createClaudeRuntimeFromConfig();
  if (!claudeRuntime) return null;
  return new ClaudeAgentRuntime(claudeRuntime);
}

export function registerAgentHandlers(mainWindow: BrowserWindow | null) {
  const sessionStore = new SessionStore();

  // Track active AbortControllers per session for cancellation
  const activeControllers = new Map<string, AbortController>();

  // ─── agent:start-analysis ───
  ipcMain.handle("agent:start-analysis", async (_event, payload: AnalysisPayload) => {
    const sessionId = randomUUID();

    // Check config readiness
    const config = getConfig();
    console.log("[agent-handlers] API Key last 4:", config.anthropicApiKey.slice(-4));
    console.log("[agent-handlers] Base URL:", config.baseURL || "(default anthropic)");
    console.log("[agent-handlers] Model:", config.model);

    const runtime = createAgentRuntime();
    if (!runtime) {
      sendEvent(mainWindow, {
        type: "run_failed",
        sessionId,
        error: "AI 未配置。请点击左下角「AI 配置」按钮，填写 API Key 和模型信息后重试。",
        recoverable: true,
        retryEligible: false,
        timestamp: Date.now(),
      });
      return { sessionId };
    }

    // Create AbortController for this session
    const controller = new AbortController();
    activeControllers.set(sessionId, controller);

    // Run analysis asynchronously, forwarding events to renderer
    void (async () => {
      try {
        await runtime.runAnalysis(
          {
            sessionId,
            requirementText: payload.requirementText,
            contextReferences: payload.contextReferences,
          },
          (event: AgentEvent) => sendEvent(mainWindow, event),
          { signal: controller.signal },
        );
      } finally {
        activeControllers.delete(sessionId);
      }
    })();

    return { sessionId };
  });

  // ─── agent:continue-analysis ───
  ipcMain.handle("agent:continue-analysis", async (_event, payload: ContinueAnalysisPayload) => {
    const sessionId = randomUUID();

    const runtime = createAgentRuntime();
    if (!runtime) {
      sendEvent(mainWindow, {
        type: "run_failed",
        sessionId,
        error: "AI 未配置。请点击左下角「AI 配置」按钮，填写 API Key 和模型信息后重试。",
        recoverable: true,
        retryEligible: false,
        timestamp: Date.now(),
      });
      return { sessionId };
    }

    // Use global maxTokens as default token budget for continuation
    const config = getConfig();
    const tokenBudget = payload.tokenBudget ?? config.maxTokens ?? 4000;

    // Create AbortController for this session
    const controller = new AbortController();
    activeControllers.set(sessionId, controller);

    // Run analysis asynchronously, forwarding events to renderer
    void (async () => {
      try {
        await runtime.continueAnalysis(
          {
            sessionId,
            previousSessionId: payload.previousSessionId,
            feedback: payload.feedback,
            tokenBudget,
          },
          (event: AgentEvent) => sendEvent(mainWindow, event),
          { signal: controller.signal },
        );
      } finally {
        activeControllers.delete(sessionId);
      }
    })();

    return { sessionId };
  });

  // ─── agent:cancel-analysis ───
  ipcMain.handle("agent:cancel-analysis", async (_event, payload: { sessionId: string }) => {
    const controller = activeControllers.get(payload.sessionId);
    if (!controller) {
      return { success: false, reason: `No active analysis for session ${payload.sessionId}` };
    }
    controller.abort();
    activeControllers.delete(payload.sessionId);
    return { success: true };
  });

  // ─── agent:review-case ───
  ipcMain.handle("agent:review-case", async (_event, _payload: ReviewCasePayload) => {
    return { success: true };
  });

  // ─── agent:load-session ───
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

  // ─── agent:list-sessions ───
  ipcMain.handle("agent:list-sessions", async () => {
    const sessions = sessionStore.listSessions();
    return sessions;
  });

  // ─── Config handlers ───
  ipcMain.handle("agent:get-config", async () => {
    return getConfigMasked();
  });

  ipcMain.handle("agent:set-config", async (_event, updates: Partial<AppConfig>) => {
    return setConfig(updates);
  });
}
