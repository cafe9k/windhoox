import { useState } from "react";
import { Popover, Typography, Space, Tag } from "antd";
import {
  LoadingOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  ReadOutlined,
  BulbOutlined,
  BarChartOutlined,
  FileProtectOutlined,
} from "@ant-design/icons";
import type { AgentEvent } from "../../../types/agent";
import { eventsToThoughtChain, createInitialThoughtChain } from "./eventToThoughtChain";

const { Text } = Typography;

// ─── Types ───

interface AgentProgressBadgeProps {
  status: "idle" | "running" | "completed" | "failed";
  events: AgentEvent[];
}

interface LogEntry {
  time: string;
  type: string;
  message: string;
  level: "info" | "success" | "error" | "loading";
}

// ─── Stage Config ───

const STAGE_ORDER = [
  "reading-sources",
  "requirement-insight",
  "generate-cases",
  "coverage-analysis",
  "completed",
];

const STAGE_LABELS: Record<string, string> = {
  "reading-sources": "读取资料",
  "requirement-insight": "需求洞察",
  "generate-cases": "生成用例",
  "coverage-analysis": "覆盖分析",
  completed: "完成",
  failed: "失败",
  analyzing: "分析中",
  generating: "生成中",
};

const STAGE_ICONS: Record<string, React.ReactNode> = {
  "reading-sources": <ReadOutlined />,
  "requirement-insight": <BulbOutlined />,
  "generate-cases": <CheckCircleOutlined />,
  "coverage-analysis": <BarChartOutlined />,
  completed: <FileProtectOutlined />,
};

// ─── Helpers ───

function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}`;
}

function eventToLog(event: AgentEvent): LogEntry | null {
  switch (event.type) {
    case "run_started":
      return { time: formatTime(event.timestamp), type: "启动", message: `会话 ${event.sessionId} 已启动`, level: "info" };
    case "reading_sources":
      return { time: formatTime(event.timestamp), type: "读取", message: `正在读取资料: ${event.source}`, level: "loading" };
    case "requirement_insight":
      return { time: formatTime(event.timestamp), type: "洞察", message: `发现业务规则: ${event.insight.businessRule || "未知"}`, level: "success" };
    case "missing_questions":
      return { time: formatTime(event.timestamp), type: "澄清", message: `生成 ${event.questions.length} 个待确认问题`, level: "info" };
    case "case_candidates":
      return { time: formatTime(event.timestamp), type: "用例", message: `生成 ${event.cases.length} 条测试用例`, level: "success" };
    case "coverage_matrix":
      return { time: formatTime(event.timestamp), type: "覆盖", message: `分析 ${event.matrix.length} 个需求点覆盖率`, level: "success" };
    case "run_completed":
      return { time: formatTime(event.timestamp), type: "完成", message: "分析流程已完成，产物已保存", level: "success" };
    case "run_failed":
      return { time: formatTime(event.timestamp), type: "失败", message: event.error, level: "error" };
    case "case_reviewed":
      return { time: formatTime(event.timestamp), type: "评审", message: `用例 ${event.caseId} 状态 → ${event.status}`, level: "info" };
    default:
      return null;
  }
}

const LEVEL_COLOR: Record<string, string> = {
  info: "blue",
  success: "green",
  error: "red",
  loading: "processing",
};

// ─── Compact Badge ───

function CompactBadge({ status, events }: AgentProgressBadgeProps) {
  if (status === "idle" || (status !== "running" && events.length === 0)) {
    return null;
  }

  const thoughtChain = events.length > 0
    ? eventsToThoughtChain(events)
    : createInitialThoughtChain();

  // Map dynamic keys to STAGE_ORDER keys
  // "generating" → "generate-cases", "analyzing" → "requirement-insight"
  const KEY_ALIASES: Record<string, string> = {
    generating: "generate-cases",
    analyzing: "requirement-insight",
  };

  const normalizedChain = thoughtChain.map((s) => ({
    ...s,
    key: KEY_ALIASES[s.key] || s.key,
  }));

  const currentStage = normalizedChain.find(
    (s) => s.status === "loading" || s.status === "error"
  );

  const completedCount = normalizedChain.filter((s) => s.status === "success").length;
  const totalCount = STAGE_ORDER.length - 1;

  return (
    <div className="agent-progress-badge">
      {/* Progress dots */}
      <div className="agent-progress-dots">
        {STAGE_ORDER.slice(0, totalCount).map((key) => {
          const stage = normalizedChain.find((s) => s.key === key);
          let dotClass = "agent-progress-dot";
          if (stage?.status === "success") dotClass += " agent-progress-dot--done";
          else if (stage?.status === "loading") dotClass += " agent-progress-dot--current";
          else if (stage?.status === "error") dotClass += " agent-progress-dot--error";
          return <span key={key} className={dotClass} />;
        })}
      </div>

      {/* Current status */}
      <Space size={4}>
        {status === "running" && <LoadingOutlined style={{ color: "#1677ff" }} />}
        {status === "completed" && <CheckCircleOutlined style={{ color: "#52c41a" }} />}
        {status === "failed" && <CloseCircleOutlined style={{ color: "#ff4d4f" }} />}
        <Text style={{ fontSize: 12, fontWeight: 500 }}>
          {status === "completed" && "分析完成"}
          {status === "failed" && "分析失败"}
          {status === "running" && currentStage
            ? `${STAGE_LABELS[currentStage.key] || currentStage.title} ${completedCount}/${totalCount}`
            : status === "running" ? "准备中..." : ""
          }
        </Text>
      </Space>
    </div>
  );
}

// ─── Detailed Panel ───

function DetailedPanel({ events, status }: { events: AgentEvent[]; status: string }) {
  const thoughtChain = events.length > 0
    ? eventsToThoughtChain(events)
    : createInitialThoughtChain();

  const logs = events.map(eventToLog).filter(Boolean) as LogEntry[];

  return (
    <div className="agent-progress-detail">
      {/* Stage overview */}
      <div className="agent-progress-stages">
        <Text strong style={{ fontSize: 12, marginBottom: 8, display: "block" }}>
          执行阶段
        </Text>
        {thoughtChain.map((stage) => (
          <div key={stage.key} className="agent-progress-stage-row">
            <span className={`agent-progress-stage-icon agent-progress-stage-icon--${stage.status}`}>
              {stage.status === "loading" ? <LoadingOutlined /> :
               stage.status === "success" ? <CheckCircleOutlined /> :
               stage.status === "error" ? <CloseCircleOutlined /> :
               <ClockCircleOutlined />}
            </span>
            <div className="agent-progress-stage-info">
              <Text style={{ fontSize: 12, fontWeight: 600 }}>{stage.title}</Text>
              {stage.description && (
                <Text type="secondary" style={{ fontSize: 11, display: "block" }}>
                  {stage.description}
                </Text>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Event log */}
      {logs.length > 0 && (
        <div className="agent-progress-log">
          <Text strong style={{ fontSize: 12, marginBottom: 8, display: "block" }}>
            事件日志
          </Text>
          <div className="agent-progress-log-list">
            {logs.map((log, i) => (
              <div key={i} className="agent-progress-log-entry">
                <Tag color={LEVEL_COLOR[log.level]} style={{ fontSize: 10, lineHeight: "16px", padding: "0 4px", margin: 0 }}>
                  {log.type}
                </Tag>
                <Text style={{ fontSize: 11, flex: 1 }}>{log.message}</Text>
                <Text type="secondary" style={{ fontSize: 10, fontFamily: "monospace", flexShrink: 0 }}>
                  {log.time}
                </Text>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───

export function AgentProgressBadge({ status, events }: AgentProgressBadgeProps) {
  const [open, setOpen] = useState(false);

  if (status === "idle") return null;

  const detailContent = (
    <DetailedPanel events={events} status={status} />
  );

  return (
    <Popover
      content={detailContent}
      title={null}
      trigger="click"
      open={open}
      onOpenChange={setOpen}
      placement="bottom"
      overlayStyle={{ width: 380 }}
      styles={{ container: { padding: 12 } }}
    >
      <div
        className="agent-progress-trigger"
        role="button"
        tabIndex={0}
        aria-label="查看 Agent 执行进度"
      >
        <CompactBadge status={status} events={events} />
      </div>
    </Popover>
  );
}
