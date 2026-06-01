import type { AgentEvent } from "../types/agent.js";
import { getConfig, isConfigReady } from "./config.js";
import { chatCompletion, buildAnalysisPrompt, DeepSeekError } from "./deepseek-client.js";

interface AgentRunnerInput {
  sessionId: string;
  requirementText: string;
  contextReferences?: string[];
}

interface RunnerOutput {
  events: AgentEvent[];
  artifacts: {
    conversationPath: string;
    insightPath: string;
    casesPath: string;
    coveragePath: string;
  };
}

interface AnalysisResult {
  insights: Array<{
    businessRule?: string;
    risk?: string;
    evidence?: string;
    confidence: "high" | "medium" | "low";
  }>;
  questions: Array<{
    id: string;
    category: "product" | "engineering" | "qa";
    question: string;
  }>;
  cases: Array<{
    id: string;
    title: string;
    description: string;
    preconditions: string[];
    steps: string[];
    expectedResult: string;
    status: "pending";
  }>;
  coverage: Array<{
    requirementId: string;
    caseIds: string[];
  }>;
}

export async function runLocalAgent(input: AgentRunnerInput): Promise<RunnerOutput> {
  const events: AgentEvent[] = [];
  const timestamp = Date.now();

  try {
    // 1. Emit analysis started
    events.push({
      type: "run_started",
      sessionId: input.sessionId,
      taskId: `task-${timestamp}`,
      timestamp,
    });

    // Check config
    if (!isConfigReady()) {
      throw new DeepSeekError(
        "DeepSeek API key is not configured. Please set it in Settings (gear icon) or create a .env.local file with DEEPSEEK_API_KEY=your_key",
      );
    }

    const config = getConfig();

    // 2. Emit reading sources
    events.push({
      type: "reading_sources",
      sessionId: input.sessionId,
      source: "requirement-text",
      timestamp: Date.now(),
    });

    // Build prompt and call DeepSeek
    const messages = buildAnalysisPrompt(input.requirementText);

    const response = await chatCompletion(
      {
        apiKey: config.deepseekApiKey,
        baseUrl: config.deepseekBaseUrl,
        model: config.deepseekModel,
      },
      messages,
    );

    // Parse JSON response
    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new DeepSeekError("DeepSeek returned empty response");
    }

    let result: AnalysisResult;
    try {
      result = JSON.parse(content) as AnalysisResult;
    } catch {
      throw new DeepSeekError("DeepSeek returned invalid JSON. Response:\n" + content);
    }

    // 3. Emit requirement insights
    if (result.insights?.length) {
      for (const insight of result.insights) {
        events.push({
          type: "requirement_insight",
          sessionId: input.sessionId,
          insight: {
            businessRule: insight.businessRule,
            risk: insight.risk,
            evidence: insight.evidence,
            confidence: insight.confidence ?? "medium",
          },
          timestamp: Date.now(),
        });
      }
    }

    // 4. Emit missing questions
    if (result.questions?.length) {
      events.push({
        type: "missing_questions",
        sessionId: input.sessionId,
        questions: result.questions.map((q) => ({
          id: q.id || `q-${Math.random().toString(36).slice(2, 8)}`,
          category: q.category,
          question: q.question,
        })),
        timestamp: Date.now(),
      });
    }

    // 5. Emit test case candidates
    if (result.cases?.length) {
      events.push({
        type: "case_candidates",
        sessionId: input.sessionId,
        cases: result.cases.map((c) => ({
          id: c.id || `TC-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
          title: c.title,
          description: c.description,
          preconditions: c.preconditions || [],
          steps: c.steps || [],
          expectedResult: c.expectedResult,
          status: "pending" as const,
        })),
        timestamp: Date.now(),
      });
    }

    // 6. Emit coverage matrix
    if (result.coverage?.length) {
      events.push({
        type: "coverage_matrix",
        sessionId: input.sessionId,
        matrix: result.coverage.map((m) => ({
          requirementId: m.requirementId,
          caseIds: m.caseIds || [],
        })),
        timestamp: Date.now(),
      });
    }

    // 7. Emit completed
    const artifactPaths = {
      conversationPath: `/tmp/${input.sessionId}/conversation.md`,
      insightPath: `/tmp/${input.sessionId}/insight.json`,
      casesPath: `/tmp/${input.sessionId}/cases.json`,
      coveragePath: `/tmp/${input.sessionId}/coverage.json`,
    };

    events.push({
      type: "run_completed",
      sessionId: input.sessionId,
      artifactPaths,
      timestamp: Date.now(),
    });

    return {
      events,
      artifacts: artifactPaths,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "未知错误";

    events.push({
      type: "run_failed",
      sessionId: input.sessionId,
      error: errorMessage,
      recoverable: true,
      retryEligible: true,
      timestamp: Date.now(),
    });

    // Re-throw so agent-handlers.ts catch block also sends the event
    throw error;
  }
}
