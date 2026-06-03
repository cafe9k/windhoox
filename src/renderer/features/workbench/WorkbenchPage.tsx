import { message } from "antd";
import { useState, useCallback, useReducer, useEffect } from "react";
import { WorkbenchLayout } from "./WorkbenchLayout";
import { LeftContextPanel } from "./LeftContextPanel";
import { AgentConversationPanel } from "./AgentConversationPanel";
import { TestArtifactPanel } from "./TestArtifactPanel";
import { AIConfigModal } from "./AIConfigModal";
import { agentStateReducer, type AgentState } from "../agent/agentState";
import type { AgentEvent } from "../../../types/agent";
import { DEMO_EVENTS, DEMO_REQUIREMENT, DEMO_SESSION_ID } from "../../demo-data";

type SessionStatus = "idle" | "running" | "completed" | "failed";

interface Session {
  id: string;
  status: SessionStatus;
  requirement?: string;
}

export function WorkbenchPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [agentState, dispatch] = useReducer(agentStateReducer, null as AgentState | null);
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(true);
  const agentApi = (window as any).windhoox?.agent;

  // Subscribe to agent events
  useEffect(() => {
    if (!agentApi) return;
    const unsubscribe = agentApi.onEvent((event: AgentEvent) => {
      dispatch(event);
      setEvents((prev) => [...prev, event]);
      if (event.type === "run_completed") {
        setSession((prev) => (prev ? { ...prev, status: "completed" } : null));
      } else if (event.type === "run_failed") {
        setSession((prev) => (prev ? { ...prev, status: "failed" } : null));
      }
    });
    return unsubscribe;
  }, [agentApi]);

  const handleStartAnalysis = useCallback(
    async (requirement: string) => {
      const sessionId = `session-${Date.now()}`;
      const newEvent: AgentEvent = {
        type: "run_started",
        sessionId,
        taskId: `task-${Date.now()}`,
        timestamp: Date.now(),
      };

      setSession({ id: sessionId, status: "running", requirement });
      dispatch(newEvent);
      setEvents([newEvent]);

      if (!agentApi) {
        message.info("Agent API 不可用，加载演示数据");
        // Load demo data
        setTimeout(() => {
          setSession({ id: DEMO_SESSION_ID, status: "running", requirement: DEMO_REQUIREMENT });
          DEMO_EVENTS.forEach((event) => {
            dispatch(event);
            setEvents((prev) => [...prev, event]);
          });
        }, 500);
        return;
      }

      try {
        await agentApi.startAnalysis({ requirementText: requirement });
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : "启动分析失败";
        message.error(errMsg);
        setSession((prev) => (prev ? { ...prev, status: "failed" } : null));
      }
    },
    [agentApi]
  );

  const handleLoadDemo = useCallback(() => {
    setSession({ id: DEMO_SESSION_ID, status: "running", requirement: DEMO_REQUIREMENT });
    setEvents([]);
    DEMO_EVENTS.forEach((event) => {
      dispatch(event);
      setEvents((prev) => [...prev, event]);
    });
  }, []);

  const handleCaseStatusChange = useCallback(
    async (caseId: string, status: AgentState["cases"][0]["status"]) => {
      if (!session) return;

      // Update local state
      dispatch({
        type: "case_reviewed",
        sessionId: session.id,
        caseId,
        status,
        timestamp: Date.now(),
      } as any);

      // Call agent API if available
      if (agentApi) {
        try {
          await agentApi.reviewCase({ sessionId: session.id, caseId, status });
        } catch (error) {
          console.error("Failed to review case:", error);
        }
      }
    },
    [session, agentApi]
  );

  const handleNewSession = useCallback(() => {
    setSession(null);
    setEvents([]);
    dispatch({ type: "run_started", sessionId: "", taskId: "", timestamp: Date.now() } as any);
  }, []);

  const handleViewDetails = useCallback(() => {
    setRightCollapsed(false);
  }, []);

  const handlePromptClick = useCallback(
    (key: string) => {
      if (key === "paste-requirement") {
        message.info("请在下方输入需求描述");
      } else if (key === "analyze-context") {
        handleLoadDemo();
      } else if (key === "edge-cases") {
        message.info("请先输入需求或使用已有会话");
      } else if (key === "coverage-gap") {
        message.info("请先完成一次分析");
      }
    },
    [handleLoadDemo]
  );

  const status = session?.status || "idle";
  const requirement = session?.requirement;
  const sessionId = session?.id;

  return (
    <>
      <WorkbenchLayout
        rightCollapsed={rightCollapsed}
        onRightCollapsedChange={setRightCollapsed}
      left={
        <LeftContextPanel
          onNewSession={handleNewSession}
          onSessionClick={(key) => console.log("Session clicked:", key)}
          onOpenConfig={() => setConfigModalOpen(true)}
          contexts={events.filter((e) => e.type === "reading_sources").map((e) => ({
            name: e.type === "reading_sources" ? e.source : "",
            type: "code" as const,
          }))}
        />
      }
      center={
        <AgentConversationPanel
          requirement={requirement}
          sessionId={sessionId}
          events={events}
          status={status}
          onSubmit={handleStartAnalysis}
          onPromptClick={handlePromptClick}
        />
      }
      right={
        <TestArtifactPanel
          cases={agentState?.cases || []}
          coverage={agentState?.coverage || []}
          questions={agentState?.questions || []}
          onCaseStatusChange={handleCaseStatusChange}
        />
      }
    />
    <AIConfigModal
      open={configModalOpen}
      onClose={() => setConfigModalOpen(false)}
    />
    </>
  );
}
