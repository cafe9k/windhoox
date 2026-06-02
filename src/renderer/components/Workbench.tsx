import { useState, useCallback, useReducer, useMemo, useEffect } from "react";
import { Empty, Spin, Typography, Space, message } from "antd";
import {
  FileTextOutlined,
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

import { LeftRail } from "./shell/LeftRail";
import { ActionGrid } from "./shell/ActionGrid";
import { Canvas } from "./canvas/Canvas";
import { Composer } from "./canvas/Composer";
import { SystemMessage } from "./canvas/messages/SystemMessage";
import { TimestampDivider } from "./canvas/messages/TimestampDivider";

const { Text } = Typography;

type SessionState = "idle" | "running" | "completed" | "failed";

interface Session {
  id: string;
  state: SessionState;
  requirement?: string;
}

const statusConfig: Record<SessionState, { text: string; dotClass: string }> = {
  idle:      { text: "就绪",     dotClass: "wh-status-dot--success" },
  running:   { text: "分析中...", dotClass: "wh-status-dot--info wh-status-dot--pulse" },
  completed: { text: "分析完成", dotClass: "wh-status-dot--success" },
  failed:    { text: "分析失败", dotClass: "wh-status-dot--error" },
};

export function Workbench() {
  const [session, setSession] = useState<Session | null>(null);
  const [agentState, dispatch] = useReducer(agentStateReducer, null as AgentState | null);
  const [showSettings, setShowSettings] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const agentApi = (window as any).windhoox?.agent;

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
    const counts = { pending: 0, accepted: 0, rejected: 0, needsClarification: 0 };
    agentState.cases.forEach((c) => {
      if      (c.status === "pending")  counts.pending++;
      else if (c.status === "accepted") counts.accepted++;
      else if (c.status === "rejected") counts.rejected++;
      else if (c.status === "ask_product" || c.status === "ask_engineering" || c.status === "needs_context") {
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
      setSession({ id: sessionId, state: "running", requirement });
      dispatch({ type: "run_started", sessionId, taskId: `task-${Date.now()}`, timestamp: Date.now() });

      try {
        const result = await agentApi.startAnalysis({ requirementText: requirement });
        setSession((prev) => (prev ? { ...prev, id: result.sessionId, state: "running" } : null));
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : "启动分析失败";
        console.error("Failed to start analysis:", error);
        setApiError(errMsg);
        setSession((prev) => (prev ? { ...prev, state: "failed" } : null));
      }
    },
    [agentApi]
  );

  const handleLoadDemo = useCallback(() => {
    setSession({ id: DEMO_SESSION_ID, state: "completed", requirement: DEMO_REQUIREMENT });
    DEMO_EVENTS.forEach((event) => { dispatch(event); });
  }, []);

  const handleCaseStatusChange = useCallback(
    async (caseId: string, status: AgentState["cases"][0]["status"]) => {
      if (!session || !agentApi) return;
      try {
        await agentApi.reviewCase({ sessionId: session.id, caseId, status });
        dispatch({ type: "case_reviewed", caseId, status, timestamp: Date.now() } as any);
      } catch (error) {
        console.error("Failed to review case:", error);
      }
    },
    [session, agentApi]
  );

  const handleContinueAnalysis = useCallback(
    async (payload: { sessionId: string; previousSessionId: string; feedback: { acceptedCaseIds: string[]; rejectedCaseIds: string[]; unresolvedQuestions: Array<{ id: string; category: string; text: string }> } }) => {
      if (!agentApi) { console.error("Agent API not available"); return; }
      const newSessionId = `session-${Date.now()}`;
      setSession((prev) => (prev ? { ...prev, id: newSessionId, state: "running" } : null));
      try {
        const result = await agentApi.continueAnalysis({ sessionId: newSessionId, previousSessionId: payload.previousSessionId, feedback: payload.feedback });
        setSession((prev) => (prev ? { ...prev, id: result.sessionId, state: "running" } : null));
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : "继续分析失败";
        console.error("Failed to continue analysis:", error);
        setApiError(errMsg);
        setSession((prev) => (prev ? { ...prev, state: "failed" } : null));
      }
    },
    [agentApi]
  );

  const cfg = session ? statusConfig[session.state] : null;

  // Canvas body content
  const renderCanvasBody = () => {
    if (!session) {
      return (
        <Space direction="vertical" style={{ width: "100%" }}>
          <div style={{ padding: "20px 0", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
            创建任务开始分析
          </div>
          <TaskInput
            onSubmit={handleStartAnalysis}
            onLoadDemo={handleLoadDemo}
          />
          <div style={{ padding: "20px 0", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
            未生成测试用例
          </div>
        </Space>
      );
    }

    if (session.state === "failed") {
      return (
        <Empty
          image={
            <div className="wh-empty-icon" style={{ color: "var(--status-error)" }}>
              <FileTextOutlined />
            </div>
          }
          description={
            <Space direction="vertical" align="center">
              <Text style={{ fontWeight: 500, color: "var(--status-error)" }}>分析失败</Text>
              <Text style={{ fontSize: 12, maxWidth: 400, textAlign: "center", color: "var(--text-muted)" }}>
                {apiError || "未知错误，请检查 DeepSeek API Key 配置后重试"}
              </Text>
            </Space>
          }
        />
      );
    }

    if (session.state === "running" && !agentState?.insights.length && !agentState?.cases.length) {
      return (
        <Empty
          image={<Spin size="large" style={{ marginBottom: 16 }} />}
          description={
            <Space direction="vertical" align="center">
              <Text style={{ fontWeight: 500, color: "var(--text-secondary)" }}>分析进行中...</Text>
              <Text style={{ fontSize: 12, color: "var(--text-muted)" }}>代理正在处理您的需求</Text>
            </Space>
          }
        />
      );
    }

    return (
      <Space direction="vertical" style={{ width: "100%" }}>
        <TimestampDivider label={new Date().toLocaleDateString("zh-CN")} />
        <SystemMessage
          title="已启动分析"
          detail={session.requirement}
        />

        {/* Insights */}
        {agentState?.insights.length ? (
          <div>
            <div className="wh-section-header">分析见解</div>
            <Space direction="vertical" style={{ width: "100%" }}>
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
          </div>
        ) : null}

        {/* Test cases */}
        {agentState?.cases.length ? (
          <div>
            <div className="wh-section-header">测试用例池</div>
            <Space direction="vertical" style={{ width: "100%" }}>
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
            {session.state === "completed" && agentState && (
              <ContinueAnalysisButton
                state={agentState}
                onContinue={handleContinueAnalysis}
              />
            )}
          </div>
        ) : null}
      </Space>
    );
  };

  return (
    <div className="wh-app-layout">
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}

      <LeftRail
        sessions={[]}
        onNewSession={() => {
          setSession(null);
          dispatch({ type: "run_started", sessionId: "", taskId: "", timestamp: Date.now() } as any);
        }}
        onOpenSettings={() => setShowSettings(true)}
      />

      <Canvas
        title={session?.requirement?.slice(0, 30) || "代理分析"}
        headerExtra={
          agentState?.cases.length ? (
            <TestCaseCounter counts={caseCounts} />
          ) : cfg ? (
            <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 500 }}>
              <span className={`wh-status-dot ${cfg.dotClass}`} />
              <span style={{ color: "var(--text-secondary)" }}>{cfg.text}</span>
            </span>
          ) : null
        }
        footer={
          session ? (
            <Composer
              placeholder="补充说明（可选），⌘↵ 继续分析…"
              onSubmit={(text) => { if (text.trim()) message.info("继续分析功能已触发"); }}
              disabled={session.state === "running"}
              submitLabel="继续分析"
            />
          ) : null
        }
      >
        {renderCanvasBody()}
      </Canvas>

      <ActionGrid />
    </div>
  );
}
