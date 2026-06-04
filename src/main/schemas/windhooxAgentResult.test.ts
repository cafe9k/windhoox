import { describe, it, expect } from "vitest";
import { windhooxAgentResultSchema } from "./windhooxAgentResult";
import { readFileSync } from "fs";
import { resolve } from "path";

const FIXTURES_DIR = resolve(__dirname, "../../../test-fixtures/claude");

function loadFixture(name: string): string {
  return readFileSync(resolve(FIXTURES_DIR, name), "utf-8");
}

describe("windhooxAgentResultSchema", () => {
  it("validates a complete valid result", () => {
    const raw = JSON.parse(loadFixture("valid-final-result.json"));
    const result = windhooxAgentResultSchema.safeParse(raw);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.pageUnderstanding.pageType).toBe("list");
      expect(result.data.cases).toHaveLength(3);
      expect(result.data.questions).toHaveLength(3);
    }
  });

  it("accepts when pageUnderstanding is missing (has default)", () => {
    const raw = JSON.parse(loadFixture("valid-final-result.json"));
    delete raw.pageUnderstanding;
    const result = windhooxAgentResultSchema.safeParse(raw);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.pageUnderstanding.pageType).toBe("unknown");
      expect(result.data.pageUnderstanding.confidence).toBe(0);
    }
  });

  it("rejects when confidence has invalid enum value", () => {
    const raw = JSON.parse(loadFixture("valid-final-result.json"));
    raw.insights[0].confidence = "very-high";
    const result = windhooxAgentResultSchema.safeParse(raw);
    expect(result.success).toBe(false);
  });

  it("accepts valid result with empty arrays", () => {
    const raw = JSON.parse(loadFixture("valid-final-result.json"));
    raw.insights = [];
    raw.questions = [];
    raw.cases = [];
    raw.coverage = [];
    const result = windhooxAgentResultSchema.safeParse(raw);
    expect(result.success).toBe(true);
  });

  it("rejects invalid fixture with wrong types", () => {
    const raw = JSON.parse(loadFixture("invalid-final-result.json"));
    const result = windhooxAgentResultSchema.safeParse(raw);
    expect(result.success).toBe(false);
  });

  it("rejects when questions is not an array", () => {
    const raw = JSON.parse(loadFixture("invalid-final-result.json"));
    const result = windhooxAgentResultSchema.safeParse(raw);
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.path.join("."));
      expect(messages.some((m) => m.includes("questions") || m.includes("pageUnderstanding"))).toBe(true);
    }
  });
});
