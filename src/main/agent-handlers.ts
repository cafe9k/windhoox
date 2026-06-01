import { ipcMain, BrowserWindow } from "electron";
import type {
  AnalysisPayload,
  ContinueAnalysisPayload,
  ReviewCasePayload,
  LoadSessionPayload
} from "../types/agent.js";
import { runLocalAgent } from "./agent-runner.js";

export function registerAgentHandlers(mainWindow: BrowserWindow | null) {
  ipcMain.handle("agent:start-analysis", async (_event, payload: AnalysisPayload) => {
    const sessionId = `session-${Date.now()}`;

    try {
      // 异步运行代理并流式发送事件
      void runLocalAgent({
        sessionId,
        requirementText: payload.requirementText,
        contextReferences: payload.contextReferences
      }).then((result) => {
        // 发送所有事件到渲染进程
        result.events.forEach((event) => {
          mainWindow?.webContents.send("agent:event", event);
        });
      }).catch((error) => {
        console.error("Agent runner error:", error);
        mainWindow?.webContents.send("agent:event", {
          type: "run_failed",
          sessionId,
          error: error instanceof Error ? error.message : "代理运行失败",
          recoverable: true,
          retryEligible: true,
          timestamp: Date.now()
        });
      });

      return { sessionId };
    } catch (error) {
      console.error("Failed to start analysis:", error);
      throw error;
    }
  });

  ipcMain.handle("agent:continue-analysis", async (_event, _payload: ContinueAnalysisPayload) => {
    return { success: true };
  });

  ipcMain.handle("agent:review-case", async (_event, _payload: ReviewCasePayload) => {
    return { success: true };
  });

  ipcMain.handle("agent:load-session", async (_event, _payload: LoadSessionPayload) => {
    return { success: true };
  });
}
