import { useState, useCallback, useReducer, useMemo, useEffect } from "react";
import { Layout, Card, Button, Empty, Spin, Tag, Typography, Space, message } from "antd";
import {
  SettingOutlined,
  FileTextOutlined,
  BulbOutlined,
  ExperimentOutlined,
} from "@ant-design/icons";
import { TaskInput } from "./TaskInput";
import { InsightCard } from "./InsightCard";
import { TestCaseCard } from "./TestCaseCard";
import { TestCaseCounter } from "./TestCaseCounter";
import { ContinueAnalysisButton } from "./ContinueAnalysisButton";
import { SettingsPanel } from "./SettingsPanel";
import { agentStateReducer, type AgentState } from "../state/agent-state";
import type { AgentEvent } from "../../types/agent";
import { DEMO_EVENTS, DEMO_REQUIREMENT, DEMO_SESSION_ID } from "../demo-data";

const { Sider, Content } = Layout;
const { Text } = Typography;

type SessionState = "idle" | "running" | "completed" | "failed";

interface Session {
  id: string;
  state: SessionState;
  requirement?: string;
}

const statusTagConfig: Record<SessionState, { text: string; color: string }> = {
  idle: { text: "就绪", color: "success" },
  running: { text: "分析中...", color: "processing" },
  completed: { text: "分析完成", color: "purple" },
  failed: { text: "分析失败", color: "error" },
};

export function Workbench() {
  const [session, setSession] = useState<Session | null>(null);
  const [agentState, dispatch] = useReducer(agentStateReducer, null as AgentState | null);
  const [showSettings, setShowSettings] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const agentApi = (window as any).windhoox?.agent;

  // Register agent event listener once on mount
  useEffect(() => {
    if (!agentApi) return;
    const unsubscribe = agentApi.onEvent((event: AgentEvent) => {
      dispatch(event);
      if (event.type === "run_completed") {
        setSession((prev) => (prev ? { ...prev, state: "completed" } : null));
        setApiError(null);
      } else if (event.type === "run_failed") {
        setSession((prev) => (prev ? { ...prev, state: "failed" } : null));
        setApiError(event.error);
      }
    });
    return unsubscribe;
  }, [agentApi]);

  const caseCounts = useMemo(() => {
    if (!agentState?.cases) {
      return { pending: 0, accepted: 0, rejected: 0, needsClarification: 0 };
    }

    const counts = {
      pending: 0,
      accepted: 0,
      rejected: 0,
      needsClarification: 0,
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
        message.error("Agent API 不可用。请确认应用通过 Electron 运行（pnpm dev），而非直接在浏览器中打开。");
        return;
      }

      const sessionId = `session-${Date.now()}`;
      setApiError(null);
      setSession({
        id: sessionId,
        state: "running",
        requirement,
      });

      // Reset agent state for a fresh run
      dispatch({ type: "run_started", sessionId, taskId: `task-${Date.now()}`, timestamp: Date.now() });

      try {
        const result = await agentApi.startAnalysis({
          requirementText: requirement,
        });

        setSession((prev) =>
          prev
            ? {
                ...prev,
                id: result.sessionId,
                state: "running",
              }
            : null
        );
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : "启动分析失败";
        console.error("Failed to start analysis:", error);
        setApiError(errMsg);
        setSession((prev) =>
          prev ? { ...prev, state: "failed" } : null
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
          status,
        });

        dispatch({
          type: "case_reviewed",
          caseId,
          status,
          timestamp: Date.now(),
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
              state: "running",
            }
          : null
      );

      try {
        const result = await agentApi.continueAnalysis({
          sessionId: newSessionId,
          previousSessionId: payload.previousSessionId,
          feedback: payload.feedback,
        });

        setSession((prev) =>
          prev
            ? {
                ...prev,
                id: result.sessionId,
                state: "running",
              }
            : null
        );

      } catch (error) {
        const errMsg = error instanceof Error ? error.message : "继续分析失败";
        console.error("Failed to continue analysis:", error);
        setApiError(errMsg);
        setSession((prev) =>
          prev ? { ...prev, state: "failed" } : null
        );
      }
    },
    [agentApi]
  );

  return (
    <Layout style={{ minHeight: "100dvh", background: "var(--color-bg)" }}>
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}

      {/* ─── Left Sidebar ─── */}
      <Sider
        width={280}
        theme="light"
        className="wh-sidebar"
        style={{ overflow: "hidden" }}
      >
        <Card
          title={
            <Space>
              <FileTextOutlined style={{ color: "var(--color-primary)" }} />
              <span>任务与上下文</span>
            </Space>
          }
          extra={
            <Button
              type="text"
              icon={<SettingOutlined />}
              onClick={() => setShowSettings(true)}
              title="设置"
            />
          }
          className="wh-sidebar-card"
        >
          <div style={{ padding: 16, height: "calc(100dvh - 48px)", overflow: "auto" }}>
            {!session ? (
              <TaskInput
                onSubmit={handleStartAnalysis}
                onLoadDemo={handleLoadDemo}
              />
            ) : (
              <Space direction="vertical" style={{ width: "100%" }}>
                <Tag
                  color={statusTagConfig[session.state].color}
                  className="wh-status-tag"
                >
                  {statusTagConfig[session.state].text}
                </Tag>
                {session.requirement && (
                  <Card size="small" className="wh-requirement-card">
                    <span className="wh-requirement-label">需求</span>
                    <div className="wh-requirement-text">
                      {session.requirement}
                    </div>
                  </Card>
                )}
              </Space>
            )}
          </div>
        </Card>
      </Sider>

      {/* ─── Main Content ─── */}
      <Content className="wh-content">
        <Card
          title={
            <Space>
              <BulbOutlined style={{ color: "var(--color-warning)" }} />
              <span>代理分析</span>
            </Space>
          }
          className="wh-content-card"
        >
          <div style={{ height: "calc(100% - 48px)", overflow: "auto" }}>
            {!session ? (
              <Empty
                image={
                  <div className="wh-empty-icon">
                    <ExperimentOutlined />
                  </div>
                }
                description={
                  <Space direction="vertical" align="center">
                    <Text style={{ fontWeight: 500 }}>创建任务开始分析</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      在左侧面板输入需求描述
                    </Text>
                  </Space>
                }
              />
            ) : session.state === "failed" ? (
              <Empty
                image={
                  <div className="wh-empty-icon" style={{ color: "var(--color-error)" }}>
                    <FileTextOutlined />
                  </div>
                }
                description={
                  <Space direction="vertical" align="center">
                    <Text style={{ fontWeight: 500, color: "var(--color-error)" }}>
                      分析失败
                    </Text>
                    <Text type="secondary" style={{ fontSize: 12, maxWidth: 400, textAlign: "center" }}>
                      {apiError || "未知错误，请检查 DeepSeek API Key 配置后重试"}
                    </Text>
                  </Space>
                }
              />
            ) : session.state === "running" && !agentState?.insights.length ? (
              <Empty
                image={<Spin size="large" style={{ marginBottom: 16 }} />}
                description={
                  <Space direction="vertical" align="center">
                    <Text style={{ fontWeight: 500 }}>分析进行中...</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      代理正在处理您的需求
                    </Text>
                  </Space>
                }
              />
            ) : agentState?.insights.length ? (
              <Space direction="vertical" style={{ width: "100%" }}>
                <div className="wh-section-header">分析见解</div>
                {agentState.insights.map((insight, index) => (
                  <div
                    key={insight.id}
                    className="wh-animate-in"
                    style={{ animationDelay: `${index * 40}ms` }}
                  >
                    <InsightCard
                      businessRule={insight.businessRule}
                      risk={insight.risk}
                      evidence={insight.evidence}
                      confidence={insight.confidence}
                    />
                  </div>
                ))}
              </Space>
            ) : (
              <Empty
                image={
                  <div className="wh-empty-icon">
                    <FileTextOutlined />
                  </div>
                }
                description="分析结果将在这里显示"
              />
            )}
          </div>
        </Card>
      </Content>

      {/* ─── Right Panel ─── */}
      <Sider
        width={340}
        theme="light"
        className="wh-right-panel"
        style={{ overflow: "hidden" }}
      >
        <Card
          title={
            <Space>
              <ExperimentOutlined style={{ color: "var(--color-success)" }} />
              <span>测试用例池</span>
            </Space>
          }
          className="wh-sidebar-card"
        >
          <div style={{ padding: 16, height: "calc(100dvh - 48px)", overflow: "auto" }}>
            {!agentState?.cases.length ? (
              <Empty description="未生成测试用例" />
            ) : (
              <Space direction="vertical" style={{ width: "100%" }}>
                <TestCaseCounter counts={caseCounts} />
                {session?.state === "completed" && agentState && (
                  <ContinueAnalysisButton
                    state={agentState}
                    onContinue={handleContinueAnalysis}
                  />
                )}
                {agentState.cases.map((testCase, index) => (
                  <div
                    key={testCase.id}
                    className="wh-animate-in"
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <TestCaseCard
                      testCase={testCase}
                      onStatusChange={handleCaseStatusChange}
                    />
                  </div>
                ))}
              </Space>
            )}
          </div>
        </Card>
      </Sider>
    </Layout>
  );
}
