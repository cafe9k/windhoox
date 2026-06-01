import { useState, useCallback, useReducer, useMemo } from "react";
import { Layout, Card, Button, Empty, Spin, Tag, Typography, Space } from "antd";
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
  const agentApi = (window as any).windhoox?.agent;

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
        console.error("Agent API not available");
        return;
      }

      const sessionId = `session-${Date.now()}`;
      setSession({
        id: sessionId,
        state: "running",
        requirement,
      });

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

        agentApi.onEvent((event: AgentEvent) => {
          dispatch(event);

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

        agentApi.onEvent((event: AgentEvent) => {
          dispatch(event);

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
          prev ? { ...prev, state: "failed" } : null
        );
      }
    },
    [agentApi]
  );

  return (
    <Layout style={{ height: "100vh", background: "#f5f7f9" }}>
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}

      <Sider
        width={280}
        theme="light"
        style={{
          borderRight: "1px solid #e5e9f0",
          overflow: "auto",
        }}
      >
        <Card
          title={
            <Space>
              <FileTextOutlined />
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
          styles={{ body: { padding: 16, height: "calc(100vh - 57px)", overflow: "auto" } }}
          style={{ height: "100%", borderRadius: 0, border: "none" }}
        >
          {!session ? (
            <TaskInput
              onSubmit={handleStartAnalysis}
              onLoadDemo={handleLoadDemo}
            />
          ) : (
            <Space direction="vertical" style={{ width: "100%" }}>
              <Tag color={statusTagConfig[session.state].color}>
                {statusTagConfig[session.state].text}
              </Tag>
              {session.requirement && (
                <Card size="small" style={{ background: "#fafbfc" }}>
                  <Text type="secondary" style={{ fontSize: 11, fontWeight: 600 }}>
                    需求
                  </Text>
                  <Text style={{ display: "block", marginTop: 4, whiteSpace: "pre-wrap" }}>
                    {session.requirement}
                  </Text>
                </Card>
              )}
            </Space>
          )}
        </Card>
      </Sider>

      <Content style={{ overflow: "auto", padding: 16 }}>
        <Card
          title={
            <Space>
              <BulbOutlined />
              <span>代理分析</span>
            </Space>
          }
          style={{ height: "100%", border: "none" }}
          styles={{ body: { padding: 16, height: "calc(100% - 57px)", overflow: "auto" } }}
        >
          {!session ? (
            <Empty
              image={<ExperimentOutlined style={{ fontSize: 48, color: "#d9d9d9" }} />}
              description={
                <Space direction="vertical" align="center">
                  <Text>创建任务开始分析</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    在左侧面板输入需求描述
                  </Text>
                </Space>
              }
            />
          ) : session.state === "running" && !agentState?.insights.length ? (
            <Empty
              image={<Spin size="large" />}
              description={
                <Space direction="vertical" align="center">
                  <Text>分析进行中...</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    代理正在处理您的需求
                  </Text>
                </Space>
              }
            />
          ) : agentState?.insights.length ? (
            <Space direction="vertical" style={{ width: "100%" }}>
              <Text strong style={{ fontSize: 12, color: "#475569" }}>
                分析见解
              </Text>
              {agentState.insights.map((insight) => (
                <InsightCard
                  key={insight.id}
                  businessRule={insight.businessRule}
                  risk={insight.risk}
                  evidence={insight.evidence}
                  confidence={insight.confidence}
                />
              ))}
            </Space>
          ) : (
            <Empty
              image={<FileTextOutlined style={{ fontSize: 48, color: "#d9d9d9" }} />}
              description="分析结果将在这里显示"
            />
          )}
        </Card>
      </Content>

      <Sider
        width={340}
        theme="light"
        style={{
          borderLeft: "1px solid #e5e9f0",
          overflow: "auto",
        }}
      >
        <Card
          title={
            <Space>
              <ExperimentOutlined />
              <span>测试用例池</span>
            </Space>
          }
          styles={{ body: { padding: 16, height: "calc(100vh - 57px)", overflow: "auto" } }}
          style={{ height: "100%", borderRadius: 0, border: "none" }}
        >
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
              {agentState.cases.map((testCase) => (
                <TestCaseCard
                  key={testCase.id}
                  testCase={testCase}
                  onStatusChange={handleCaseStatusChange}
                />
              ))}
            </Space>
          )}
        </Card>
      </Sider>
    </Layout>
  );
}
