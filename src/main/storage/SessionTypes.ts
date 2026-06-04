/**
 * Session storage types and interfaces.
 */

import type { AgentEvent } from "../../types/agent.js";

export interface SessionMetadata {
  id: string;
  createdAt: number;
  status: "running" | "completed" | "failed";
  requirementText: string;
  model: string;
  totalTokens?: number;
  duration?: number;
  /** For continued sessions, references the previous session's ID. */
  previousSessionId?: string;
}

export interface SessionPaths {
  conversationPath: string;
  insightPath: string;
  casesPath: string;
  coveragePath: string;
  validationPath: string;
  eventsPath: string;
  metadataPath: string;
}

export interface SessionData {
  metadata: SessionMetadata;
  events: AgentEvent[];
  paths: SessionPaths;
}
