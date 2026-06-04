import type { BubbleProps } from "@ant-design/x";
import {
  PlayCircleOutlined,
  ReadOutlined,
  BulbOutlined,
  QuestionCircleOutlined,
  CheckCircleOutlined,
  BarChartOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import type { AgentEvent } from "../../../types/agent";

interface BubbleItem {
  key: string;
  content: string;
  placement?: "left" | "right";
  role?: "user" | "assistant" | "system";
  avatar?: React.ReactNode;
  loading?: boolean;
  typing?: boolean;
}

// Helper to create styled avatar
function StyledAvatar({ icon, bg }: { icon: React.ReactNode; bg: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 32,
        height: 32,
        borderRadius: "50%",
        backgroundColor: bg,
        color: "#fff",
        fontSize: 16,
      }}
    >
      {icon}
    </span>
  );
}

/**
 * Maps AgentEvent to Bubble items for display in Bubble.List
 */
export function eventToBubble(event: AgentEvent): BubbleItem | null {
  switch (event.type) {
    case "run_started":
      return {
        key: `run-started-${event.timestamp}`,
        content: "开始分析测试需求...",
        role: "assistant",
        placement: "left",
        avatar: <StyledAvatar icon={<PlayCircleOutlined />} bg="#1677ff" />,
      };

    case "reading_sources":
      return {
        key: `reading-${event.timestamp}`,
        content: `正在读取资料：${event.source}`,
        role: "assistant",
        placement: "left",
        avatar: <StyledAvatar icon={<ReadOutlined />} bg="#52c41a" />,
      };

    case "requirement_insight":
      return {
        key: `insight-${event.timestamp}`,
        content: formatInsight(event.insight),
        role: "assistant",
        placement: "left",
        avatar: <StyledAvatar icon={<BulbOutlined />} bg="#faad14" />,
      };

    case "missing_questions":
      return {
        key: `questions-${event.timestamp}`,
        content: formatQuestions(event.questions),
        role: "assistant",
        placement: "left",
        avatar: <StyledAvatar icon={<QuestionCircleOutlined />} bg="#722ed1" />,
      };

    case "case_candidates":
      return {
        key: `cases-${event.timestamp}`,
        content: `已生成 ${event.cases.length} 条候选测试用例`,
        role: "assistant",
        placement: "left",
        avatar: <StyledAvatar icon={<CheckCircleOutlined />} bg="#52c41a" />,
      };

    case "coverage_matrix":
      return {
        key: `coverage-${event.timestamp}`,
        content: `已生成覆盖矩阵，共 ${event.matrix.length} 个需求点`,
        role: "assistant",
        placement: "left",
        avatar: <StyledAvatar icon={<BarChartOutlined />} bg="#13c2c2" />,
      };

    case "run_completed":
      return {
        key: `completed-${event.timestamp}`,
        content: "分析完成！测试用例已生成，请在右侧面板查看和评审。",
        role: "assistant",
        placement: "left",
        avatar: <StyledAvatar icon={<CheckCircleOutlined />} bg="#52c41a" />,
      };

    case "run_failed":
      return {
        key: `failed-${event.timestamp}`,
        content: `分析失败：${event.error}`,
        role: "assistant",
        placement: "left",
        avatar: <StyledAvatar icon={<CloseCircleOutlined />} bg="#ff4d4f" />,
      };

    case "run_continued":
      return {
        key: `continued-${event.timestamp}`,
        content: `继续分析（基于上一轮会话 ${event.previousSessionId.slice(0, 8)}...）`,
        role: "assistant",
        placement: "left",
        avatar: <StyledAvatar icon={<ReloadOutlined />} bg="#722ed1" />,
      };

    case "case_reviewed":
      // Case review events don't generate bubbles
      return null;

    default:
      return null;
  }
}

/**
 * Creates a user bubble for requirement input
 */
export function createUserBubble(requirement: string, sessionId: string): BubbleItem {
  return {
    key: `user-${sessionId}`,
    content: requirement,
    role: "user",
    placement: "right",
  };
}

/**
 * Creates a loading bubble for running state
 */
export function createLoadingBubble(): BubbleItem {
  return {
    key: "loading",
    content: "正在处理...",
    role: "assistant",
    placement: "left",
    loading: true,
    avatar: <StyledAvatar icon={<PlayCircleOutlined />} bg="#1677ff" />,
  };
}

function formatInsight(insight: {
  businessRule?: string;
  risk?: string;
  evidence?: string;
  confidence: "high" | "medium" | "low";
}): string {
  const parts: string[] = [];

  if (insight.businessRule) {
    parts.push(`**业务规则**：${insight.businessRule}`);
  }
  if (insight.risk) {
    parts.push(`**风险点**：${insight.risk}`);
  }
  if (insight.evidence) {
    parts.push(`**证据**：${insight.evidence}`);
  }
  if (insight.confidence) {
    parts.push(`**置信度**：${insight.confidence}`);
  }

  return parts.join("\n\n");
}

function formatQuestions(questions: Array<{
  id: string;
  category: "product" | "engineering" | "qa";
  question: string;
}>): string {
  const header = `发现 ${questions.length} 个待确认问题：\n\n`;
  const items = questions.map((q, i) => `${i + 1}. [${q.category}] ${q.question}`).join("\n");
  return header + items;
}
