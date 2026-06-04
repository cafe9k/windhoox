import { windhooxAgentResultSchema, type WindhooxAgentResult } from "../../schemas/windhooxAgentResult.js";

// ─── Error types ───

export interface ExtractorParseError {
  kind: "parse_error";
  message: string;
  rawSnippet: string;
}

export interface ExtractorValidationError {
  kind: "validation_error";
  message: string;
  issues: Array<{ path: string; message: string }>;
  parsedJson: unknown;
}

export interface ExtractorRepairNeeded {
  kind: "repair_needed";
  message: string;
  originalError: ExtractorParseError | ExtractorValidationError;
}

export type ExtractorResult =
  | { success: true; data: WindhooxAgentResult }
  | { success: false; error: ExtractorParseError | ExtractorValidationError | ExtractorRepairNeeded };

// ─── Extraction helpers ───

/**
 * Try to extract JSON from a Markdown ```json code fence.
 */
function extractFromCodeFence(message: string): string | null {
  // Match ```json ... ``` (with optional whitespace)
  const fenceRegex = /```(?:json)?\s*\n?([\s\S]*?)```/;
  const match = message.match(fenceRegex);
  if (match) {
    return match[1].trim();
  }
  return null;
}

/**
 * Try to extract the first complete JSON object from a string.
 * Uses brace-counting to find matching { ... }.
 */
function extractFirstJsonObject(message: string): string | null {
  const startIdx = message.indexOf("{");
  if (startIdx === -1) return null;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = startIdx; i < message.length; i++) {
    const ch = message[i];

    if (escape) {
      escape = false;
      continue;
    }

    if (ch === "\\") {
      escape = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (ch === "{") depth++;
    if (ch === "}") {
      depth--;
      if (depth === 0) {
        return message.slice(startIdx, i + 1);
      }
    }
  }

  return null;
}

/**
 * Try to parse a string as JSON. Returns the parsed value or null.
 */
function tryParse(raw: string): { parsed: unknown } | { error: string } {
  try {
    return { parsed: JSON.parse(raw) };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

// ─── Main extractor ───

/**
 * Extract and validate a WindhooxAgentResult from a Claude final message.
 *
 * Extraction order:
 * 1. Try ```json code fence
 * 2. Try first complete JSON object
 * 3. JSON.parse
 * 4. zod schema validate
 */
export function extractResult(message: string): ExtractorResult {
  if (!message || !message.trim()) {
    return {
      success: false,
      error: {
        kind: "parse_error",
        message: "Empty message — no JSON content to extract",
        rawSnippet: "",
      },
    };
  }

  // Step 1: try code fence
  const fenced = extractFromCodeFence(message);
  if (fenced) {
    const parseResult = tryParse(fenced);
    if ("parsed" in parseResult) {
      return validateSchema(parseResult.parsed, fenced);
    }
    // Code fence found but not valid JSON — fall through to try plain JSON extraction
  }

  // Step 2: try first complete JSON object
  const jsonStr = extractFirstJsonObject(message);
  if (jsonStr) {
    const parseResult = tryParse(jsonStr);
    if ("parsed" in parseResult) {
      return validateSchema(parseResult.parsed, jsonStr);
    }
    return {
      success: false,
      error: {
        kind: "parse_error",
        message: `JSON.parse failed: ${parseResult.error}`,
        rawSnippet: jsonStr.slice(0, 500),
      },
    };
  }

  // Nothing found
  return {
    success: false,
    error: {
      kind: "parse_error",
      message: "No JSON object found in message",
      rawSnippet: message.slice(0, 500),
    },
  };
}

// ─── Repair strategies ───

/**
 * Attempt to repair common JSON issues:
 * 1. Remove trailing commas before } or ]
 * 2. Remove trailing content after the JSON object
 */
function attemptRepair(raw: string): string {
  let repaired = raw;

  // Remove trailing commas before closing braces/brackets
  repaired = repaired.replace(/,\s*([}\]])/g, "$1");

  return repaired;
}

/**
 * Extract with automatic repair retry.
 *
 * If the initial extraction fails, applies repair strategies and retries once.
 * Returns the original error if repair also fails.
 */
export function extractResultWithRetry(message: string, maxRetries: number = 1): ExtractorResult {
  const firstAttempt = extractResult(message);
  if (firstAttempt.success) return firstAttempt;

  if (maxRetries <= 0) return firstAttempt;

  // Try repair for parse errors
  if (firstAttempt.error.kind === "parse_error") {
    const repaired = attemptRepair(firstAttempt.error.rawSnippet || message);
    if (repaired !== message) {
      const retryResult = extractResult(repaired);
      if (retryResult.success) {
        return {
          success: true,
          data: retryResult.data,
        };
      }
      // Repair didn't help — return a repair_needed error
      return {
        success: false,
        error: {
          kind: "repair_needed",
          message: `Auto-repair attempted but failed. Original: ${firstAttempt.error.message}. After repair: ${retryResult.error.message}`,
          originalError: firstAttempt.error,
        },
      };
    }
  }

  // Try repair for validation errors — the parsed JSON might have fixable issues
  if (firstAttempt.error.kind === "validation_error") {
    const rawJson = JSON.stringify(firstAttempt.error.parsedJson);
    const repaired = attemptRepair(rawJson);
    if (repaired !== rawJson) {
      const retryResult = extractResult(repaired);
      if (retryResult.success) {
        return { success: true, data: retryResult.data };
      }
    }
  }

  return firstAttempt;
}

function validateSchema(parsed: unknown, rawJson: string): ExtractorResult {
  const result = windhooxAgentResultSchema.safeParse(parsed);
  if (result.success) {
    return { success: true, data: result.data };
  }

  const issues = result.error.issues.map((issue: { path: PropertyKey[]; message: string }) => ({
    path: issue.path.map(String).join("."),
    message: issue.message,
  }));

  return {
    success: false,
    error: {
      kind: "validation_error",
      message: `Schema validation failed: ${issues.length} issue(s)`,
      issues,
      parsedJson: parsed,
    },
  };
}
