import {
  ReadOutlined,
  BulbOutlined,
  CheckCircleOutlined,
  BarChartOutlined,
  LoadingOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";
import type { AgentEvent } from "../../../types/agent";

export interface ThoughtChainItem {
  key: string;
  title: string;
  description?: string;
  status: "loading" | "success" | "error" | "abort";
  icon?: React.ReactNode;
}

/**
 * Maps a sequence of AgentEvents to ThoughtChain items
 * This builds a timeline of the Agent's execution stages
 */
export function eventsToThoughtChain(events: AgentEvent[]): ThoughtChainItem[] {
  const stages: ThoughtChainItem[] = [];

  // Stage 1: Reading sources
  const readingEvents = events.filter((e) => e.type === "reading_sources");
  if (readingEvents.length > 0) {
    const sources = readingEvents.map((e) => {
      if (e.type === "reading_sources") return e.source;
      return "";
    });
    stages.push({
      key: "reading-sources",
      title: "读取资料",
      description: `已读取 ${sources.length} 个文件`,
      status: "success",
      icon: <ReadOutlined />,
    });
  }

  // Stage 2: Requirement insight
  const insightEvents = events.filter((e) => e.type === "requirement_insight");
  if (insightEvents.length > 0) {
    stages.push({
      key: "requirement-insight",
      title: "需求洞察",
      description: `发现 ${insightEvents.length} 个业务规则`,
      status: "success",
      icon: <BulbOutlined />,
    });
  }

  // Stage 3: Generate test cases
  const caseEvents = events.filter((e) => e.type === "case_candidates");
  if (caseEvents.length > 0) {
    const lastCaseEvent = caseEvents[caseEvents.length - 1];
    if (lastCaseEvent.type === "case_candidates") {
      stages.push({
        key: "generate-cases",
        title: "生成用例",
        description: `生成 ${lastCaseEvent.cases.length} 条候选用例`,
        status: "success",
        icon: <CheckCircleOutlined />,
      });
    }
  }

  // Stage 4: Coverage analysis
  const coverageEvents = events.filter((e) => e.type === "coverage_matrix");
  if (coverageEvents.length > 0) {
    const lastCoverageEvent = coverageEvents[coverageEvents.length - 1];
    if (lastCoverageEvent.type === "coverage_matrix") {
      stages.push({
        key: "coverage-analysis",
        title: "覆盖分析",
        description: `分析 ${lastCoverageEvent.matrix.length} 个需求点`,
        status: "success",
        icon: <BarChartOutlined />,
      });
    }
  }

  // Stage 5: Completion or failure
  const completedEvents = events.filter((e) => e.type === "run_completed");
  const failedEvents = events.filter((e) => e.type === "run_failed");

  if (completedEvents.length > 0) {
    stages.push({
      key: "completed",
      title: "分析完成",
      description: "测试用例已生成",
      status: "success",
      icon: <CheckCircleOutlined />,
    });
  } else if (failedEvents.length > 0) {
    const lastFailedEvent = failedEvents[failedEvents.length - 1];
    if (lastFailedEvent.type === "run_failed") {
      stages.push({
        key: "failed",
        title: "分析失败",
        description: lastFailedEvent.error,
        status: "error",
        icon: <CloseCircleOutlined />,
      });
    }
  } else if (events.length > 0) {
    // Still running - add loading stage
    const lastEvent = events[events.length - 1];
    if (lastEvent.type === "reading_sources") {
      stages.push({
        key: "analyzing",
        title: "分析中",
        description: "正在处理需求...",
        status: "loading",
        icon: <LoadingOutlined />,
      });
    } else if (lastEvent.type === "requirement_insight") {
      stages.push({
        key: "generating",
        title: "生成用例中",
        description: "正在生成测试用例...",
        status: "loading",
        icon: <LoadingOutlined />,
      });
    }
  }

  return stages;
}

/**
 * Creates initial ThoughtChain with pending stages
 */
export function createInitialThoughtChain(): ThoughtChainItem[] {
  return [
    {
      key: "reading-sources",
      title: "读取资料",
      description: "等待开始",
      status: "loading",
      icon: <ReadOutlined />,
    },
    {
      key: "requirement-insight",
      title: "需求洞察",
      description: "等待开始",
      status: "loading",
      icon: <BulbOutlined />,
    },
    {
      key: "generate-cases",
      title: "生成用例",
      description: "等待开始",
      status: "abort",
      icon: <CheckCircleOutlined />,
    },
    {
      key: "coverage-analysis",
      title: "覆盖分析",
      description: "等待开始",
      status: "abort",
      icon: <BarChartOutlined />,
    },
  ];
}

/**
 * Updates ThoughtChain to show running state
 */
export function createRunningThoughtChain(currentStage: string): ThoughtChainItem[] {
  const stages = createInitialThoughtChain();

  const stageIndex = stages.findIndex((s) => s.key === currentStage);
  if (stageIndex >= 0) {
    // Mark previous stages as success
    for (let i = 0; i < stageIndex; i++) {
      stages[i].status = "success";
      stages[i].description = "已完成";
    }
    // Mark current stage as loading
    stages[stageIndex].status = "loading";
    stages[stageIndex].icon = <LoadingOutlined />;
    stages[stageIndex].description = "处理中...";
  }

  return stages;
}
