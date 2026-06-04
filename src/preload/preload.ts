import { contextBridge, ipcRenderer } from "electron";
import type {
  AnalysisPayload,
  ContinueAnalysisPayload,
  ReviewCasePayload,
  LoadSessionPayload,
  AppConfig,
  AgentEventListener,
  AgentEvent,
  SessionSummary,
} from "../types/agent.js";

const agentApi = {
  startAnalysis: (payload: AnalysisPayload) =>
    ipcRenderer.invoke("agent:start-analysis", payload),
  continueAnalysis: (payload: ContinueAnalysisPayload) =>
    ipcRenderer.invoke("agent:continue-analysis", payload),
  cancelAnalysis: (payload: { sessionId: string }) =>
    ipcRenderer.invoke("agent:cancel-analysis", payload),
  reviewCase: (payload: ReviewCasePayload) =>
    ipcRenderer.invoke("agent:review-case", payload),
  loadSession: (payload: LoadSessionPayload) =>
    ipcRenderer.invoke("agent:load-session", payload),
  listSessions: (): Promise<SessionSummary[]> =>
    ipcRenderer.invoke("agent:list-sessions"),
  getConfig: () =>
    ipcRenderer.invoke("agent:get-config"),
  setConfig: (updates: Partial<AppConfig>) =>
    ipcRenderer.invoke("agent:set-config", updates),
  onEvent: (listener: AgentEventListener) => {
    const channel = "agent:event";
    const wrappedListener = (_event: any, data: AgentEvent) => listener(data);
    ipcRenderer.on(channel, wrappedListener);
    return () => ipcRenderer.removeListener(channel, wrappedListener);
  }
};

contextBridge.exposeInMainWorld("windhoox", {
  appName: "Windhoox",
  platform: process.platform,
  agent: agentApi
});

