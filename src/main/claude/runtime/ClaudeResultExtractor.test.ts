import { describe, it, expect } from "vitest";
import { extractResult } from "./ClaudeResultExtractor";
import { readFileSync } from "fs";
import { resolve } from "path";

const FIXTURES_DIR = resolve(__dirname, "../../../../test-fixtures/claude");

function loadFixture(name: string): string {
  return readFileSync(resolve(FIXTURES_DIR, name), "utf-8");
}

describe("ClaudeResultExtractor", () => {
  it("extracts valid JSON from plain JSON fixture", () => {
    const raw = loadFixture("valid-final-result.json");
    const result = extractResult(raw);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.pageUnderstanding.pageType).toBe("list");
      expect(result.data.cases).toHaveLength(3);
    }
  });

  it("extracts JSON from Markdown code fence", () => {
    const raw = loadFixture("final-message-with-code-fence.md");
    const result = extractResult(raw);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.pageUnderstanding.pageType).toBe("form");
      expect(result.data.cases).toHaveLength(1);
    }
  });

  it("extracts JSON with extra text before and after", () => {
    const raw = loadFixture("final-message-with-extra-text.md");
    const result = extractResult(raw);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.pageUnderstanding.pageType).toBe("detail");
      expect(result.data.insights).toHaveLength(2);
    }
  });

  it("returns parse_error for invalid JSON", () => {
    const message = "Here is some text { with broken json }}} no valid object here";
    const result = extractResult(message);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.kind).toBe("parse_error");
    }
  });

  it("returns parse_error for empty message", () => {
    const result = extractResult("");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.kind).toBe("parse_error");
    }
  });

  it("returns validation_error for invalid schema fixture", () => {
    const raw = loadFixture("invalid-final-result.json");
    const result = extractResult(raw);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.kind).toBe("validation_error");
      if (result.error.kind === "validation_error") {
        expect(result.error.issues.length).toBeGreaterThan(0);
      }
    }
  });

  it("returns validation_error when confidence enum is wrong", () => {
    const raw = JSON.parse(loadFixture("valid-final-result.json"));
    raw.insights[0].confidence = "super-high";
    const message = JSON.stringify(raw);
    const result = extractResult(message);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.kind).toBe("validation_error");
    }
  });

  it("does not depend on Electron", () => {
    // This test verifies the module can be imported in a non-Electron context
    // (vitest runs in Node, not Electron)
    expect(typeof extractResult).toBe("function");
  });
});
