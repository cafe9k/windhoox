/**
 * DeepSeek API client — native fetch, typed requests/responses.
 *
 * Uses DeepSeek's /chat/completions endpoint with JSON mode for
 * structured output. Supports the reasoning model (deepseek-reasoner).
 *
 * API docs: https://api-docs.deepseek.com/
 */

export interface DeepSeekMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface DeepSeekChoice {
  index: number;
  message: DeepSeekMessage;
  finish_reason: string;
}

export interface DeepSeekResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: DeepSeekChoice[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface DeepSeekClientOptions {
  apiKey: string;
  baseUrl: string;
  model: string;
}

export class DeepSeekError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string,
  ) {
    super(message);
    this.name = "DeepSeekError";
  }
}

/**
 * Call DeepSeek /chat/completions with the given messages.
 * Uses JSON mode to enforce structured output.
 */
export async function chatCompletion(
  options: DeepSeekClientOptions,
  messages: DeepSeekMessage[],
): Promise<DeepSeekResponse> {
  const { apiKey, baseUrl, model } = options;

  if (!apiKey) {
    throw new DeepSeekError("DeepSeek API key is not configured. Please set it in Settings or .env.local.");
  }

  const url = `${baseUrl.replace(/\/$/, "")}/chat/completions`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 8192,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "Unknown error");
    throw new DeepSeekError(
      `DeepSeek API error (${response.status}): ${errorBody}`,
      response.status,
    );
  }

  return response.json() as Promise<DeepSeekResponse>;
}

/**
 * Build the system prompt for requirement analysis.
 */
export function buildAnalysisPrompt(requirementText: string): DeepSeekMessage[] {
  const systemPrompt = `You are an expert QA analyst. Your task is to analyze a software requirement and produce a structured test design output.

Analyze the requirement from the following angles:
1. Business Rules — extract implicit and explicit rules
2. Risks — identify potential failure points and edge cases
3. Missing Information — identify gaps that need clarification from product/engineering
4. Test Cases — generate concrete test cases with preconditions, steps, and expected results
5. Coverage — map test cases back to requirement areas

Output MUST be a valid JSON object with this exact structure:
{
  "insights": [
    {
      "businessRule": "string (describe the rule)",
      "risk": "string (describe the risk)",
      "evidence": "string (reference specific requirement text)",
      "confidence": "high" | "medium" | "low"
    }
  ],
  "questions": [
    {
      "id": "q-001",
      "category": "product" | "engineering" | "qa",
      "question": "string (the clarifying question)"
    }
  ],
  "cases": [
    {
      "id": "TC-001",
      "title": "string (short title)",
      "description": "string (what this case verifies)",
      "preconditions": ["string"],
      "steps": ["string"],
      "expectedResult": "string",
      "status": "pending"
    }
  ],
  "coverage": [
    {
      "requirementId": "string (requirement area name)",
      "caseIds": ["TC-001", "TC-002"]
    }
  ]
}

Requirements:
- Generate at least 3 insights and at least 5 test cases
- Insights should vary in confidence (not all high)
- Questions should be specific and actionable
- Test cases should cover: happy path, error cases, edge cases, and boundary conditions
- All content must be in Chinese if the requirement is in Chinese, otherwise in English
- Do not include markdown formatting in the JSON — raw JSON only`;

  return [
    { role: "system", content: systemPrompt },
    { role: "user", content: `Please analyze the following requirement:\n\n${requirementText}` },
  ];
}
