import { describe, it, expect, beforeEach } from "vitest";
import {
  EventAdapter,
  resultToAgentEvents,
  createRunStartedEvent,
  createReadingSourceEvents,
  resetAutoIdCounters,
} from "./ClaudeEventAdapter";
import type { WindhooxAgentResult } from "../../schemas/windhooxAgentResult";
import { readFileSync } from "fs";
import { resolve } from "path";

const FIXTURES_DIR = resolve(__dirname, "../../../../test-fixtures/claude");

import { windhooxAgentResultSchema } from "../../schemas/windhooxAgentResult.js";

function loadValidResult(): WindhooxAgentResult {
  const raw = JSON.parse(readFileSync(resolve(FIXTURES_DIR, "valid-final-result.json"), "utf-8"));
  return windhooxAgentResultSchema.parse(raw);
}

const SESSION_ID = "test-session-001";
const BASE_TS = 1700000000000;

beforeEach(() => {
  resetAutoIdCounters();
});

describe("ClaudeEventAdapter", () => {
  describe("resultToAgentEvents", () => {
    it("generates one requirement_insight per insight", () => {
      const result = loadValidResult();
      const events = resultToAgentEvents(result, SESSION_ID, BASE_TS);
      const insights = events.filter((e) => e.type === "requirement_insight");
      expect(insights).toHaveLength(result.insights.length);
      expect(insights[0].type).toBe("requirement_insight");
    });

    it("generates one missing_questions event when questions exist", () => {
      const result = loadValidResult();
      const events = resultToAgentEvents(result, SESSION_ID, BASE_TS);
      const questionEvents = events.filter((e) => e.type === "missing_questions");
      expect(questionEvents).toHaveLength(1);
      if (questionEvents[0].type === "missing_questions") {
        expect(questionEvents[0].questions).toHaveLength(result.questions.length);
      }
    });

    it("generates one case_candidates event when cases exist", () => {
      const result = loadValidResult();
      const events = resultToAgentEvents(result, SESSION_ID, BASE_TS);
      const caseEvents = events.filter((e) => e.type === "case_candidates");
      expect(caseEvents).toHaveLength(1);
      if (caseEvents[0].type === "case_candidates") {
        expect(caseEvents[0].cases).toHaveLength(result.cases.length);
      }
    });

    it("generates one coverage_matrix event when coverage entries exist", () => {
      const result = loadValidResult();
      const events = resultToAgentEvents(result, SESSION_ID, BASE_TS);
      const coverageEvents = events.filter((e) => e.type === "coverage_matrix");
      expect(coverageEvents).toHaveLength(1);
      if (coverageEvents[0].type === "coverage_matrix") {
        expect(coverageEvents[0].matrix).toHaveLength(result.coverage.length);
      }
    });

    it("uses the same sessionId for all events", () => {
      const result = loadValidResult();
      const events = resultToAgentEvents(result, SESSION_ID, BASE_TS);
      expect(events.length).toBeGreaterThan(0);
      for (const event of events) {
        expect(event.sessionId).toBe(SESSION_ID);
      }
    });

    it("auto-generates question IDs when missing", () => {
      const result = loadValidResult();
      result.questions[0] = { id: "", category: "product", question: "What?" };
      const events = resultToAgentEvents(result, SESSION_ID, BASE_TS);
      const questionEvent = events.find((e) => e.type === "missing_questions");
      if (questionEvent?.type === "missing_questions") {
        expect(questionEvent.questions[0].id).toMatch(/^q-auto-\d+$/);
      }
    });

    it("auto-generates case IDs when missing", () => {
      const result = loadValidResult();
      result.cases[0] = {
        ...result.cases[0],
        id: "",
      };
      const events = resultToAgentEvents(result, SESSION_ID, BASE_TS);
      const caseEvent = events.find((e) => e.type === "case_candidates");
      if (caseEvent?.type === "case_candidates") {
        expect(caseEvent.cases[0].id).toMatch(/^TC-auto-\d{3}$/);
      }
    });

    it("sets all case statuses to pending", () => {
      const result = loadValidResult();
      const events = resultToAgentEvents(result, SESSION_ID, BASE_TS);
      const caseEvent = events.find((e) => e.type === "case_candidates");
      if (caseEvent?.type === "case_candidates") {
        for (const c of caseEvent.cases) {
          expect(c.status).toBe("pending");
        }
      }
    });

    it("does not generate missing_questions when questions array is empty", () => {
      const result = loadValidResult();
      result.questions = [];
      const events = resultToAgentEvents(result, SESSION_ID, BASE_TS);
      const questionEvents = events.filter((e) => e.type === "missing_questions");
      expect(questionEvents).toHaveLength(0);
    });

    it("does not generate case_candidates when cases array is empty", () => {
      const result = loadValidResult();
      result.cases = [];
      const events = resultToAgentEvents(result, SESSION_ID, BASE_TS);
      const caseEvents = events.filter((e) => e.type === "case_candidates");
      expect(caseEvents).toHaveLength(0);
    });

    it("does not generate coverage_matrix when coverage array is empty", () => {
      const result = loadValidResult();
      result.coverage = [];
      const events = resultToAgentEvents(result, SESSION_ID, BASE_TS);
      const coverageEvents = events.filter((e) => e.type === "coverage_matrix");
      expect(coverageEvents).toHaveLength(0);
    });

    it("preserves event ordering: insights → questions → cases → coverage", () => {
      const result = loadValidResult();
      const events = resultToAgentEvents(result, SESSION_ID, BASE_TS);
      const types = events.map((e) => e.type);
      // All insights come first
      const lastInsightIdx = types.lastIndexOf("requirement_insight");
      const firstQuestionIdx = types.indexOf("missing_questions");
      const firstCaseIdx = types.indexOf("case_candidates");
      const firstCoverageIdx = types.indexOf("coverage_matrix");

      if (firstQuestionIdx !== -1) {
        expect(lastInsightIdx).toBeLessThan(firstQuestionIdx);
      }
      if (firstCaseIdx !== -1 && firstQuestionIdx !== -1) {
        expect(firstQuestionIdx).toBeLessThan(firstCaseIdx);
      }
      if (firstCoverageIdx !== -1 && firstCaseIdx !== -1) {
        expect(firstCaseIdx).toBeLessThan(firstCoverageIdx);
      }
    });
  });

  describe("createRunStartedEvent", () => {
    it("creates a run_started event with correct fields", () => {
      const event = createRunStartedEvent(SESSION_ID, BASE_TS);
      expect(event.type).toBe("run_started");
      expect(event.sessionId).toBe(SESSION_ID);
      expect(event.timestamp).toBe(BASE_TS);
      expect(event.taskId).toContain(SESSION_ID);
    });
  });

  describe("createReadingSourceEvents", () => {
    it("creates one reading_sources event per source", () => {
      const events = createReadingSourceEvents(SESSION_ID, ["src/file1.ts", "src/file2.ts"], BASE_TS);
      expect(events).toHaveLength(2);
      expect(events[0].source).toBe("src/file1.ts");
      expect(events[1].source).toBe("src/file2.ts");
      expect(events[0].timestamp).toBe(BASE_TS);
      expect(events[1].timestamp).toBe(BASE_TS + 1);
    });

    it("returns empty array when no sources", () => {
      const events = createReadingSourceEvents(SESSION_ID, [], BASE_TS);
      expect(events).toHaveLength(0);
    });
  });

  describe("EventAdapter class", () => {
    it("instances have independent ID counters", () => {
      const adapter1 = new EventAdapter();
      const adapter2 = new EventAdapter();

      const result = loadValidResult();
      // Clear IDs so auto-generation kicks in
      result.questions[0] = { id: "", category: "product", question: "Q1" };
      result.cases[0] = { ...result.cases[0], id: "" };

      const events1 = adapter1.resultToAgentEvents(result, SESSION_ID, BASE_TS);
      const events2 = adapter2.resultToAgentEvents(result, SESSION_ID, BASE_TS);

      // Both adapters start from counter 1, so IDs should be identical within each adapter
      const q1 = events1.find((e) => e.type === "missing_questions");
      const q2 = events2.find((e) => e.type === "missing_questions");
      if (q1?.type === "missing_questions" && q2?.type === "missing_questions") {
        expect(q1.questions[0].id).toBe("q-auto-1");
        expect(q2.questions[0].id).toBe("q-auto-1");
      }

      const c1 = events1.find((e) => e.type === "case_candidates");
      const c2 = events2.find((e) => e.type === "case_candidates");
      if (c1?.type === "case_candidates" && c2?.type === "case_candidates") {
        expect(c1.cases[0].id).toBe("TC-auto-001");
        expect(c2.cases[0].id).toBe("TC-auto-001");
      }
    });

    it("resetCounters resets instance counters", () => {
      const adapter = new EventAdapter();
      const result = loadValidResult();
      result.questions[0] = { id: "", category: "product", question: "Q1" };

      // First call: counter = 1
      const events1 = adapter.resultToAgentEvents(result, SESSION_ID, BASE_TS);
      const q1 = events1.find((e) => e.type === "missing_questions");
      if (q1?.type === "missing_questions") {
        expect(q1.questions[0].id).toBe("q-auto-1");
      }

      // Reset: counter back to 0
      adapter.resetCounters();

      // Second call: counter = 1 again
      const events2 = adapter.resultToAgentEvents(result, SESSION_ID, BASE_TS);
      const q2 = events2.find((e) => e.type === "missing_questions");
      if (q2?.type === "missing_questions") {
        expect(q2.questions[0].id).toBe("q-auto-1");
      }
    });

    it("sequential calls increment counters within an instance", () => {
      const adapter = new EventAdapter();
      const result = loadValidResult();
      result.questions[0] = { id: "", category: "product", question: "Q1" };

      // First call: counter = 1
      const events1 = adapter.resultToAgentEvents(result, SESSION_ID, BASE_TS);
      const q1 = events1.find((e) => e.type === "missing_questions");
      if (q1?.type === "missing_questions") {
        expect(q1.questions[0].id).toBe("q-auto-1");
      }

      // Second call without reset: counter = 2
      const events2 = adapter.resultToAgentEvents(result, SESSION_ID, BASE_TS);
      const q2 = events2.find((e) => e.type === "missing_questions");
      if (q2?.type === "missing_questions") {
        expect(q2.questions[0].id).toBe("q-auto-2");
      }
    });
  });
});
