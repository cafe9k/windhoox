import { ipcMain } from "electron";
import type {
  AnalysisPayload,
  ContinueAnalysisPayload,
  ReviewCasePayload,
  LoadSessionPayload
} from "../types/agent.js";

export function registerAgentHandlers() {
  ipcMain.handle("agent:start-analysis", async (_event, payload: AnalysisPayload) => {
    const sessionId = `session-${Date.now()}`;
    return { sessionId };
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
