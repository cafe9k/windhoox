import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { SessionStore } from "./SessionStore.js";
import { ArtifactWriter } from "./ArtifactWriter.js";
import type { AgentEvent } from "../../types/agent.js";
import type { WindhooxAgentResult } from "../schemas/windhooxAgentResult.js";
import type { SessionMetadata } from "./SessionTypes.js";

describe("SessionStore", () => {
  let tempDir: string;
  let store: SessionStore;
  let writer: ArtifactWriter;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "windhoox-test-"));
    store = new SessionStore(tempDir);
    writer = new ArtifactWriter(tempDir);
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  const mockMetadata: SessionMetadata = {
    id: "session-123",
    createdAt: Date.now(),
    status: "completed",
    requirementText: "Test requirement",
    model: "claude-sonnet-4-5",
    totalTokens: 1000,
    duration: 5000,
  };

  const mockResult: WindhooxAgentResult = {
    pageUnderstanding: {
      pageType: "form",
      businessDomain: "test",
      confidence: 0.95,
      modules: [],
      risks: [],
    },
    insights: [],
    questions: [],
    cases: [],
    coverage: [],
    validation: {
      passed: true,
      score: 100,
      missingCoverage: [],
      duplicatedCases: [],
    },
  };

  const mockEvents: AgentEvent[] = [
    {
      type: "run_started",
      sessionId: "session-123",
      timestamp: Date.now(),
    },
  ];

  it("loads session metadata", () => {
    writer.writeAll(
      "session-123",
      "Test requirement",
      [],
      mockEvents,
      mockResult,
      {},
      mockMetadata
    );

    const metadata = store.loadMetadata("session-123");
    expect(metadata).not.toBeNull();
    expect(metadata!.id).toBe("session-123");
    expect(metadata!.status).toBe("completed");
  });

  it("loads session events", () => {
    writer.writeAll(
      "session-123",
      "Test requirement",
      [],
      mockEvents,
      mockResult,
      {},
      mockMetadata
    );

    const events = store.loadEvents("session-123");
    expect(events).not.toBeNull();
    expect(events).toHaveLength(1);
    expect(events![0].type).toBe("run_started");
  });

  it("loads full session data", () => {
    writer.writeAll(
      "session-123",
      "Test requirement",
      [],
      mockEvents,
      mockResult,
      {},
      mockMetadata
    );

    const session = store.loadSession("session-123");
    expect(session).not.toBeNull();
    expect(session!.metadata.id).toBe("session-123");
    expect(session!.events).toHaveLength(1);
    expect(session!.paths.conversationPath).toContain("session-123");
  });

  it("returns null for non-existent session", () => {
    const metadata = store.loadMetadata("non-existent");
    expect(metadata).toBeNull();

    const events = store.loadEvents("non-existent");
    expect(events).toBeNull();

    const session = store.loadSession("non-existent");
    expect(session).toBeNull();
  });

  it("lists all sessions", () => {
    // Create multiple sessions
    writer.writeAll(
      "session-1",
      "Requirement 1",
      [],
      mockEvents,
      mockResult,
      {},
      { ...mockMetadata, id: "session-1", createdAt: Date.now() - 2000 }
    );

    writer.writeAll(
      "session-2",
      "Requirement 2",
      [],
      mockEvents,
      mockResult,
      {},
      { ...mockMetadata, id: "session-2", createdAt: Date.now() - 1000 }
    );

    writer.writeAll(
      "session-3",
      "Requirement 3",
      [],
      mockEvents,
      mockResult,
      {},
      { ...mockMetadata, id: "session-3", createdAt: Date.now() }
    );

    const sessions = store.listSessions();
    expect(sessions).toHaveLength(3);
    // Should be sorted by creation time (newest first)
    expect(sessions[0].id).toBe("session-3");
    expect(sessions[1].id).toBe("session-2");
    expect(sessions[2].id).toBe("session-1");
  });

  it("returns empty array when no sessions exist", () => {
    const sessions = store.listSessions();
    expect(sessions).toEqual([]);
  });

  it("checks if session exists", () => {
    writer.writeAll(
      "session-123",
      "Test requirement",
      [],
      mockEvents,
      mockResult,
      {},
      mockMetadata
    );

    expect(store.sessionExists("session-123")).toBe(true);
    expect(store.sessionExists("non-existent")).toBe(false);
  });

  it("deletes session", () => {
    writer.writeAll(
      "session-123",
      "Test requirement",
      [],
      mockEvents,
      mockResult,
      {},
      mockMetadata
    );

    expect(store.sessionExists("session-123")).toBe(true);

    const deleted = store.deleteSession("session-123");
    expect(deleted).toBe(true);
    expect(store.sessionExists("session-123")).toBe(false);
  });

  it("returns false when deleting non-existent session", () => {
    const deleted = store.deleteSession("non-existent");
    expect(deleted).toBe(false);
  });
});
