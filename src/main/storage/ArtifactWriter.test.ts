import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { ArtifactWriter } from "./ArtifactWriter.js";
import type { AgentEvent } from "../../types/agent.js";
import type { WindhooxAgentResult } from "../schemas/windhooxAgentResult.js";
import type { SessionMetadata } from "./SessionTypes.js";

describe("ArtifactWriter", () => {
  let tempDir: string;
  let writer: ArtifactWriter;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "windhoox-test-"));
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
      modules: [
        {
          name: "Login",
          description: "User login form",
          elements: ["username", "password", "submit"],
        },
      ],
      risks: [
        {
          type: "security",
          description: "Password storage",
          source: "requirement",
        },
      ],
    },
    insights: [
      {
        businessRule: "Password must be hashed",
        risk: "Security vulnerability",
        evidence: "Best practice",
        confidence: "high",
      },
    ],
    questions: [
      {
        id: "q-001",
        category: "security",
        question: "What password policy?",
      },
    ],
    cases: [
      {
        id: "TC-001",
        title: "Login with valid credentials",
        description: "User can login",
        preconditions: ["User exists"],
        steps: ["Enter username", "Enter password", "Click submit"],
        expectedResult: "Login successful",
      },
    ],
    coverage: [
      {
        requirementId: "req-001",
        caseIds: ["TC-001"],
      },
    ],
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
    {
      type: "run_completed",
      sessionId: "session-123",
      artifactPaths: {
        conversationPath: "",
        insightPath: "",
        casesPath: "",
        coveragePath: "",
      },
      timestamp: Date.now(),
    },
  ];

  it("writes all artifacts to session directory", () => {
    const paths = writer.writeAll(
      "session-123",
      "Test requirement",
      ["context1.txt"],
      mockEvents,
      mockResult,
      { trace: "mock" },
      mockMetadata
    );

    expect(fs.existsSync(paths.conversationPath)).toBe(true);
    expect(fs.existsSync(paths.insightPath)).toBe(true);
    expect(fs.existsSync(paths.casesPath)).toBe(true);
    expect(fs.existsSync(paths.coveragePath)).toBe(true);
    expect(fs.existsSync(paths.validationPath)).toBe(true);
    expect(fs.existsSync(paths.eventsPath)).toBe(true);
    expect(fs.existsSync(paths.metadataPath)).toBe(true);
  });

  it("writes valid JSON files", () => {
    const paths = writer.writeAll(
      "session-123",
      "Test requirement",
      [],
      mockEvents,
      mockResult,
      { trace: "mock" },
      mockMetadata
    );

    const insightContent = JSON.parse(fs.readFileSync(paths.insightPath, "utf-8"));
    expect(insightContent).toEqual(mockResult);

    const casesContent = JSON.parse(fs.readFileSync(paths.casesPath, "utf-8"));
    expect(casesContent).toEqual(mockResult.cases);

    const eventsContent = JSON.parse(fs.readFileSync(paths.eventsPath, "utf-8"));
    expect(eventsContent).toEqual(mockEvents);
  });

  it("writes markdown summary", () => {
    const paths = writer.writeAll(
      "session-123",
      "Test requirement",
      [],
      mockEvents,
      mockResult,
      { trace: "mock" },
      mockMetadata
    );

    const mdContent = fs.readFileSync(paths.conversationPath, "utf-8");
    expect(mdContent).toContain("# Analysis Summary");
    expect(mdContent).toContain("## Page Understanding");
    expect(mdContent).toContain("## Insights");
    expect(mdContent).toContain("## Test Cases");
  });

  it("writes session metadata", () => {
    const paths = writer.writeAll(
      "session-123",
      "Test requirement",
      [],
      mockEvents,
      mockResult,
      { trace: "mock" },
      mockMetadata
    );

    const metadataContent = JSON.parse(fs.readFileSync(paths.metadataPath, "utf-8"));
    expect(metadataContent.id).toBe("session-123");
    expect(metadataContent.status).toBe("completed");
    expect(metadataContent.requirementText).toBe("Test requirement");
  });

  it("writes input with requirement and context", () => {
    writer.writeAll(
      "session-123",
      "Test requirement",
      ["context1.txt", "context2.txt"],
      mockEvents,
      mockResult,
      { trace: "mock" },
      mockMetadata
    );

    const sessionDir = path.join(tempDir, "windhoox", "sessions", "session-123");
    const inputPath = path.join(sessionDir, "input.json");
    expect(fs.existsSync(inputPath)).toBe(true);

    const inputContent = JSON.parse(fs.readFileSync(inputPath, "utf-8"));
    expect(inputContent.requirementText).toBe("Test requirement");
    expect(inputContent.contextReferences).toEqual(["context1.txt", "context2.txt"]);
  });

  it("writes trace data", () => {
    const traceData = { messages: [{ role: "user", content: "test" }] };
    writer.writeAll(
      "session-123",
      "Test requirement",
      [],
      mockEvents,
      mockResult,
      traceData,
      mockMetadata
    );

    const sessionDir = path.join(tempDir, "windhoox", "sessions", "session-123");
    const tracePath = path.join(sessionDir, "trace.json");
    expect(fs.existsSync(tracePath)).toBe(true);

    const traceContent = JSON.parse(fs.readFileSync(tracePath, "utf-8"));
    expect(traceContent).toEqual(traceData);
  });
});
