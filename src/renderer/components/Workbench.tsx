import React, { useState, useCallback, useReducer } from "react";
import { TaskInput } from "./TaskInput";
import { InsightCard } from "./InsightCard";
import { TestCaseCard } from "./TestCaseCard";
import { agentStateReducer, type AgentState } from "../state/agent-state";
import type { AgentEvent } from "../../types/agent";
import "./Workbench.css";

type SessionState = "idle" | "running" | "completed" | "failed";

interface Session {
  id: string;
  state: SessionState;
  requirement?: string;
}

export function Workbench() {
  const [session, setSession] = useState<Session | null>(null);
  const [agentState, dispatch] = useReducer(agentStateReducer, null as AgentState | null);
  const agentApi = (window as any).windhoox?.agent;

  const handleStartAnalysis = useCallback(
    async (requirement: string) => {
      if (!agentApi) {
        console.error("Agent API not available");
        return;
      }

      const sessionId = `session-${Date.now()}`;
      setSession({
        id: sessionId,
        state: "running",
        requirement
      });

      try {
        const result = await agentApi.startAnalysis({
          requirementText: requirement
        });

        setSession((prev) =>
          prev
            ? {
                ...prev,
                id: result.sessionId,
                state: "running"
              }
            : null
        );

        // 监听代理事件
        agentApi.onEvent((event: AgentEvent) => {
          dispatch(event);

          // 根据事件更新会话状态
          if (event.type === "run_completed") {
            setSession((prev) =>
              prev ? { ...prev, state: "completed" } : null
            );
          } else if (event.type === "run_failed") {
            setSession((prev) =>
              prev ? { ...prev, state: "failed" } : null
            );
          }
        });
      } catch (error) {
        console.error("Failed to start analysis:", error);
        setSession((prev) =>
          prev
            ? {
                ...prev,
                state: "failed"
              }
            : null
        );
      }
    },
    [agentApi]
  );

  const handleCaseStatusChange = useCallback(
    async (caseId: string, status: AgentState["cases"][0]["status"]) => {
      if (!session || !agentApi) return;

      try {
        await agentApi.reviewCase({
          sessionId: session.id,
          caseId,
          status
        });
      } catch (error) {
        console.error("Failed to review case:", error);
      }
    },
    [session, agentApi]
  );

  return (
    <div className="workbench">
      <aside className="workbench-panel left-panel">
        <div className="panel-header">任务与上下文</div>
        <div className="panel-content">
          {!session ? (
            <TaskInput onSubmit={handleStartAnalysis} />
          ) : (
            <div className="session-info">
              <div className="session-state" data-state={session.state}>
                {session.state === "running" && "分析中..."}
                {session.state === "completed" && "分析完成"}
                {session.state === "failed" && "分析失败"}
                {session.state === "idle" && "就绪"}
              </div>
              {session.requirement && (
                <div className="session-requirement">
                  <strong>需求:</strong>
                  <p>{session.requirement}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>

      <main className="workbench-panel center-panel">
        <div className="panel-header">代理分析</div>
        <div className="panel-content">
          {!session ? (
            <div className="empty-state">
              <p>创建任务开始分析</p>
            </div>
          ) : session.state === "running" && !agentState?.insights.length ? (
            <div className="empty-state">
              <p>分析进行中...</p>
            </div>
          ) : agentState?.insights.length ? (
            <div className="analysis-results">
              <div className="insights-section">
                <h4>分析见解</h4>
                {agentState.insights.map((insight) => (
                  <InsightCard
                    key={insight.id}
                    businessRule={insight.businessRule}
                    risk={insight.risk}
                    evidence={insight.evidence}
                    confidence={insight.confidence}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <p>分析结果将在这里显示</p>
            </div>
          )}
        </div>
      </main>

      <aside className="workbench-panel right-panel">
        <div className="panel-header">测试用例池</div>
        <div className="panel-content">
          {!agentState?.cases.length ? (
            <div className="empty-state">
              <p>未生成测试用例</p>
            </div>
          ) : (
            <div className="cases-section">
              {agentState.cases.map((testCase) => (
                <TestCaseCard
                  key={testCase.id}
                  testCase={testCase}
                  onStatusChange={handleCaseStatusChange}
                />
              ))}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
