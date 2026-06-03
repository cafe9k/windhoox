/**
 * SessionStore - Loads and manages session data from disk.
 */

import { app } from "electron";
import fs from "node:fs";
import path from "node:path";
import type { AgentEvent } from "../../types/agent.js";
import type { SessionMetadata, SessionData, SessionPaths } from "./SessionTypes.js";

export class SessionStore {
  private userDataPath: string;

  constructor(userDataPath?: string) {
    this.userDataPath = userDataPath ?? app.getPath("userData");
  }

  /**
   * Get the session directory path.
   */
  private getSessionDir(sessionId: string): string {
    return path.join(this.userDataPath, "windhoox", "sessions", sessionId);
  }

  /**
   * Read a JSON file from the session directory.
   */
  private readJson<T>(sessionId: string, filename: string): T | null {
    const filePath = path.join(this.getSessionDir(sessionId), filename);
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const content = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(content) as T;
  }

  /**
   * Load session metadata.
   */
  loadMetadata(sessionId: string): SessionMetadata | null {
    return this.readJson<SessionMetadata>(sessionId, "session-metadata.json");
  }

  /**
   * Load session events.
   */
  loadEvents(sessionId: string): AgentEvent[] | null {
    return this.readJson<AgentEvent[]>(sessionId, "events.json");
  }

  /**
   * Load full session data.
   */
  loadSession(sessionId: string): SessionData | null {
    const metadata = this.loadMetadata(sessionId);
    if (!metadata) {
      return null;
    }

    const events = this.loadEvents(sessionId) ?? [];

    const sessionDir = this.getSessionDir(sessionId);
    const paths: SessionPaths = {
      conversationPath: path.join(sessionDir, "final-output.md"),
      insightPath: path.join(sessionDir, "final-result.json"),
      casesPath: path.join(sessionDir, "cases.json"),
      coveragePath: path.join(sessionDir, "coverage.json"),
      validationPath: path.join(sessionDir, "validation.json"),
      eventsPath: path.join(sessionDir, "events.json"),
      metadataPath: path.join(sessionDir, "session-metadata.json"),
    };

    return {
      metadata,
      events,
      paths,
    };
  }

  /**
   * List all sessions.
   */
  listSessions(): SessionMetadata[] {
    const sessionsDir = path.join(this.userDataPath, "windhoox", "sessions");
    if (!fs.existsSync(sessionsDir)) {
      return [];
    }

    const entries = fs.readdirSync(sessionsDir, { withFileTypes: true });
    const sessions: SessionMetadata[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }

      const sessionId = entry.name;
      const metadata = this.loadMetadata(sessionId);
      if (metadata) {
        sessions.push(metadata);
      }
    }

    // Sort by creation time (newest first)
    sessions.sort((a, b) => b.createdAt - a.createdAt);
    return sessions;
  }

  /**
   * Check if a session exists.
   */
  sessionExists(sessionId: string): boolean {
    const metadataPath = path.join(this.getSessionDir(sessionId), "session-metadata.json");
    return fs.existsSync(metadataPath);
  }

  /**
   * Delete a session.
   */
  deleteSession(sessionId: string): boolean {
    const sessionDir = this.getSessionDir(sessionId);
    if (!fs.existsSync(sessionDir)) {
      return false;
    }

    fs.rmSync(sessionDir, { recursive: true, force: true });
    return true;
  }
}
