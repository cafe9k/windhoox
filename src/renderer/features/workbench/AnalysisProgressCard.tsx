import { Card, Typography, Space, Tag, Statistic, Button } from "antd";
import {
  LoadingOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  ReadOutlined,
  BulbOutlined,
  BarChartOutlined,
  FileProtectOutlined,
  ExperimentOutlined,
  RightOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { ThoughtChain } from "@ant-design/x";
import type { AgentEvent } from "../../../types/agent";
import { eventsToThoughtChain, createInitialThoughtChain } from "./eventToThoughtChain";

const { Text, Title } = Typography;

// ─── Types ───

interface AnalysisProgressCardProps {
  status: "idle" | "running" | "completed" | "failed";
  events: AgentEvent[];
  cases?: Array<{
    id: string;
    title: string;
    status: "pending" | "accepted" | "rejected" | "ask_product" | "ask_engineering" | "needs_context";
  }>;
  coverage?: Array<{
    requirementId: string;
    caseIds: string[];
  }>;
  questions?: Array<{
    id: string;
    category: "product" | "engineering" | "qa";
    question: string;
  }>;
  onViewDetails?: () => void;
  /** Called when user clicks "Continue Analysis" in completed/failed state. */
  onContinueAnalysis?: () => void;
}

// ─── Stage Config ───

const STAGE_ORDER = [
  "reading-sources",
  "requirement-insight",
  "generate-cases",
  "coverage-analysis",
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

// ─── Progress Header ───

function ProgressHeader({
  status,
  events,
}: {
  status: "running" | "completed" | "failed";
  events: AgentEvent[];
}) {
  const thoughtChain = events.length > 0
    ? eventsToThoughtChain(events)
    : createInitialThoughtChain();

  // Map dynamic keys to STAGE_ORDER keys
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
  const totalCount = STAGE_ORDER.length;

  if (status === "completed") {
    return (
      <div className="analysis-card-header analysis-card-header--completed">
        <Space>
          <CheckCircleOutlined style={{ color: "#52c41a", fontSize: 20 }} />
          <Text strong style={{ fontSize: 16 }}>分析完成</Text>
        </Space>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="analysis-card-header analysis-card-header--failed">
        <Space>
          <CloseCircleOutlined style={{ color: "#ff4d4f", fontSize: 20 }} />
          <Text strong style={{ fontSize: 16 }}>分析失败</Text>
        </Space>
      </div>
    );
  }

  // Running state
  return (
    <div className="analysis-card-header analysis-card-header--running">
      <div className="analysis-card-progress-dots">
        {STAGE_ORDER.map((key) => {
          const stage = normalizedChain.find((s) => s.key === key);
          let dotClass = "analysis-progress-dot";
          if (stage?.status === "success") dotClass += " analysis-progress-dot--done";
          else if (stage?.status === "loading") dotClass += " analysis-progress-dot--current";
          else if (stage?.status === "error") dotClass += " analysis-progress-dot--error";

          return (
            <div key={key} className="analysis-progress-dot-wrapper">
              <span className={dotClass}>
                {stage?.status === "success" ? STAGE_ICONS[key] :
                 stage?.status === "loading" ? <LoadingOutlined /> :
                 stage?.status === "error" ? <CloseCircleOutlined /> :
                 STAGE_ICONS[key]}
              </span>
              <Text
                type={stage?.status === "loading" ? undefined : "secondary"}
                style={{ fontSize: 11, marginTop: 4 }}
              >
                {STAGE_LABELS[key]}
              </Text>
            </div>
          );
        })}
      </div>
      <div className="analysis-card-progress-text">
        {currentStage && (
          <Text style={{ fontSize: 13, fontWeight: 500 }}>
            {STAGE_LABELS[currentStage.key] || currentStage.title} {completedCount}/{totalCount}
          </Text>
        )}
      </div>
    </div>
  );
}

// ─── Summary Card ───

function SummaryCard({
  cases = [],
  coverage = [],
  questions = [],
  onViewDetails,
  onContinueAnalysis,
}: {
  cases?: AnalysisProgressCardProps["cases"];
  coverage?: AnalysisProgressCardProps["coverage"];
  questions?: AnalysisProgressCardProps["questions"];
  onViewDetails?: () => void;
  onContinueAnalysis?: () => void;
}) {
  const counts = {
    total: cases.length,
    accepted: cases.filter((c) => c.status === "accepted").length,
    pending: cases.filter((c) => c.status === "pending").length,
    rejected: cases.filter((c) => c.status === "rejected").length,
    needsClarification: cases.filter((c) =>
      c.status === "ask_product" || c.status === "ask_engineering" || c.status === "needs_context"
    ).length,
    gaps: coverage.filter((c) => c.caseIds.length === 0).length + questions.length,
  };

  return (
    <div
      className="analysis-summary-card"
      onClick={onViewDetails}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onViewDetails?.();
        }
      }}
    >
      <div className="analysis-summary-header">
        <Space>
          <ExperimentOutlined style={{ fontSize: 24, color: "#1677ff" }} />
          <div>
            <Text strong style={{ fontSize: 15 }}>测试用例总览</Text>
            <Text type="secondary" style={{ fontSize: 12, display: "block" }}>
              点击查看详细用例
            </Text>
          </div>
        </Space>
        <RightOutlined style={{ color: "#8c8c8c", fontSize: 16 }} />
      </div>

      <div className="analysis-summary-metrics">
        <div className="analysis-summary-metric">
          <Statistic
            title="候选用例"
            value={counts.total}
            valueStyle={{ fontSize: 24, fontWeight: 600 }}
          />
        </div>
        <div className="analysis-summary-metric">
          <Statistic
            title="已接受"
            value={counts.accepted}
            valueStyle={{ fontSize: 24, fontWeight: 600, color: "#52c41a" }}
          />
        </div>
        <div className="analysis-summary-metric">
          <Statistic
            title="待确认"
            value={counts.pending + counts.needsClarification}
            valueStyle={{ fontSize: 24, fontWeight: 600, color: "#faad14" }}
          />
        </div>
        <div className="analysis-summary-metric">
          <Statistic
            title="覆盖缺口"
            value={counts.gaps}
            valueStyle={{ fontSize: 24, fontWeight: 600, color: "#ff4d4f" }}
          />
        </div>
      </div>

      {onContinueAnalysis && (
        <div style={{ marginTop: 16, display: "flex", justifyContent: "center" }}>
          <Button
            type="primary"
            icon={<ReloadOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              onContinueAnalysis();
            }}
          >
            继续分析（基于当前结果优化）
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───

export function AnalysisProgressCard({
  status,
  events,
  cases = [],
  coverage = [],
  questions = [],
  onViewDetails,
  onContinueAnalysis,
}: AnalysisProgressCardProps) {
  if (status === "idle") return null;

  const thoughtChainItems = events.length > 0
    ? eventsToThoughtChain(events)
    : createInitialThoughtChain();

  return (
    <Card
      className="analysis-progress-card"
      styles={{
        body: { padding: "16px 20px" }
      }}
    >
      {/* Progress Header */}
      <ProgressHeader status={status} events={events} />

      {/* Card Body */}
      <div className="analysis-card-body">
        {status === "running" && (
          <div className="analysis-card-stages">
            <ThoughtChain
              items={thoughtChainItems.map((item) => ({
                key: item.key,
                title: item.title,
                description: item.description,
                status: item.status,
                icon: item.icon,
              }))}
            />
          </div>
        )}

        {status === "completed" && (
          <SummaryCard
            cases={cases}
            coverage={coverage}
            questions={questions}
            onViewDetails={onViewDetails}
            onContinueAnalysis={onContinueAnalysis}
          />
        )}

        {status === "failed" && (
          <div className="analysis-card-error">
            <Text type="danger">分析过程中出现错误，请重试</Text>
            {onContinueAnalysis && (
              <div style={{ marginTop: 12 }}>
                <Button
                  type="primary"
                  icon={<ReloadOutlined />}
                  onClick={onContinueAnalysis}
                >
                  重试/继续分析
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
