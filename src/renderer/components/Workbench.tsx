import React, { useState, useCallback, useReducer, useMemo } from "react";
import { TaskInput } from "./TaskInput";
import { InsightCard } from "./InsightCard";
import { TestCaseCard } from "./TestCaseCard";
import { TestCaseCounter } from "./TestCaseCounter";
import { ContinueAnalysisButton } from "./ContinueAnalysisButton";
import { agentStateReducer, type AgentState } from "../state/agent-state";
import type { AgentEvent } from "../../types/agent";
import { DEMO_EVENTS, DEMO_REQUIREMENT, DEMO_SESSION_ID } from "../demo-data";
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

  // 计算测试用例计数
  const caseCounts = useMemo(() => {
    if (!agentState?.cases) {
      return { pending: 0, accepted: 0, rejected: 0, needsClarification: 0 };
    }

    const counts = {
      pending: 0,
      accepted: 0,
      rejected: 0,
      needsClarification: 0
    };

    agentState.cases.forEach((c) => {
      if (c.status === "pending") {
        counts.pending++;
      } else if (c.status === "accepted") {
        counts.accepted++;
      } else if (c.status === "rejected") {
        counts.rejected++;
      } else if (c.status === "ask_product" || c.status === "ask_engineering" || c.status === "needs_context") {
        counts.needsClarification++;
      }
    });

    return counts;
  }, [agentState?.cases]);

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

  const handleLoadDemo = useCallback(() => {
    setSession({
      id: DEMO_SESSION_ID,
      state: "completed",
      requirement: DEMO_REQUIREMENT,
    });

    // Dispatch all demo events sequentially
    DEMO_EVENTS.forEach((event) => {
      dispatch(event);
    });
  }, []);

  const handleCaseStatusChange = useCallback(
    async (caseId: string, status: AgentState["cases"][0]["status"]) => {
      if (!session || !agentApi) return;

      try {
        await agentApi.reviewCase({
          sessionId: session.id,
          caseId,
          status
        });

        // 更新本地状态
        dispatch({
          type: "case_reviewed",
          caseId,
          status,
          timestamp: Date.now()
        } as any);
      } catch (error) {
        console.error("Failed to review case:", error);
      }
    },
    [session, agentApi]
  );

  const handleContinueAnalysis = useCallback(
    async (payload: {
      sessionId: string;
      previousSessionId: string;
      feedback: {
        acceptedCaseIds: string[];
        rejectedCaseIds: string[];
        unresolvedQuestions: Array<{
          id: string;
          category: string;
          text: string;
        }>;
      };
    }) => {
      if (!agentApi) {
        console.error("Agent API not available");
        return;
      }

      const newSessionId = `session-${Date.now()}`;
      setSession((prev) =>
        prev
          ? {
              ...prev,
              id: newSessionId,
              state: "running"
            }
          : null
      );

      try {
        const result = await agentApi.continueAnalysis({
          sessionId: newSessionId,
          previousSessionId: payload.previousSessionId,
          feedback: payload.feedback
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
        console.error("Failed to continue analysis:", error);
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

  return (
    <div className="workbench">
      <aside className="workbench-panel left-panel">
        <div className="panel-header">任务与上下文</div>
        <div className="panel-content">
          {!session ? (
            <TaskInput onSubmit={handleStartAnalysis} onLoadDemo={handleLoadDemo} />
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
              <div className="empty-state-icon">📋</div>
              <p>创建任务开始分析</p>
              <p className="empty-state-hint">在左侧面板输入需求描述</p>
            </div>
          ) : session.state === "running" && !agentState?.insights.length ? (
            <div className="empty-state">
              <div className="loading-spinner"></div>
              <p>分析进行中...</p>
              <p className="empty-state-hint">代理正在处理您的需求</p>
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
              <div className="empty-state-icon">📊</div>
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
            <>
              <TestCaseCounter counts={caseCounts} />
              {session?.state === "completed" && agentState && (
                <ContinueAnalysisButton
                  state={agentState}
                  onContinue={handleContinueAnalysis}
                />
              )}
              <div className="cases-section">
                {agentState.cases.map((testCase) => (
                  <TestCaseCard
                    key={testCase.id}
                    testCase={testCase}
                    onStatusChange={handleCaseStatusChange}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
