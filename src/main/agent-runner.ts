import type { AgentEvent } from "../types/agent.js";

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

export async function runLocalAgent(input: AgentRunnerInput): Promise<RunnerOutput> {
  const events: AgentEvent[] = [];

  try {
    // 发出分析开始事件
    events.push({
      type: "run_started",
      sessionId: input.sessionId,
      taskId: `task-${Date.now()}`,
      timestamp: Date.now()
    });

    // 这里将由真实的本地代理实现替换
    // 现在返回一个成功完成的事件
    events.push({
      type: "run_completed",
      sessionId: input.sessionId,
      artifactPaths: {
        conversationPath: `/tmp/${input.sessionId}/conversation.md`,
        insightPath: `/tmp/${input.sessionId}/insight.json`,
        casesPath: `/tmp/${input.sessionId}/cases.json`,
        coveragePath: `/tmp/${input.sessionId}/coverage.json`
      },
      timestamp: Date.now()
    });

    return {
      events,
      artifacts: {
        conversationPath: `/tmp/${input.sessionId}/conversation.md`,
        insightPath: `/tmp/${input.sessionId}/insight.json`,
        casesPath: `/tmp/${input.sessionId}/cases.json`,
        coveragePath: `/tmp/${input.sessionId}/coverage.json`
      }
    };
  } catch (error) {
    events.push({
      type: "run_failed",
      sessionId: input.sessionId,
      error: error instanceof Error ? error.message : "未知错误",
      recoverable: true,
      retryEligible: true,
      timestamp: Date.now()
    });

    throw error;
  }
}
