import { Welcome, Prompts, Sender, Bubble, ThoughtChain } from "@ant-design/x";
import { FileTextOutlined, BulbOutlined, SearchOutlined, CheckSquareOutlined } from "@ant-design/icons";
import { useState, useMemo } from "react";
import { Typography, Space } from "antd";
import { eventToBubble, createUserBubble, createLoadingBubble } from "./eventToBubble";
import { eventsToThoughtChain, createInitialThoughtChain } from "./eventToThoughtChain";
import type { AgentEvent } from "../../../types/agent";

const { Text } = Typography;

const WELCOME_PROMPTS = [
  {
    key: "paste-requirement",
    label: "粘贴需求生成用例",
    description: "输入产品需求文档或描述",
    icon: <FileTextOutlined style={{ color: "#1677ff" }} />,
  },
  {
    key: "analyze-context",
    label: "基于本地资料分析",
    description: "读取 PRD、代码、接口文档",
    icon: <SearchOutlined style={{ color: "#52c41a" }} />,
  },
  {
    key: "edge-cases",
    label: "补齐边界场景",
    description: "发现遗漏的测试场景",
    icon: <BulbOutlined style={{ color: "#faad14" }} />,
  },
  {
    key: "coverage-gap",
    label: "检查覆盖缺口",
    description: "分析测试覆盖完整性",
    icon: <CheckSquareOutlined style={{ color: "#722ed1" }} />,
  },
];

type SessionStatus = "idle" | "running" | "completed" | "failed";

interface AgentConversationPanelProps {
  requirement?: string;
  sessionId?: string;
  events?: AgentEvent[];
  status?: SessionStatus;
  onSubmit?: (requirement: string) => void;
  onPromptClick?: (key: string) => void;
}

export function AgentConversationPanel({
  requirement,
  sessionId,
  events = [],
  status = "idle",
  onSubmit,
  onPromptClick,
}: AgentConversationPanelProps) {
  const [inputValue, setInputValue] = useState("");

  const handleSubmit = (value: string) => {
    if (!value.trim()) return;
    onSubmit?.(value);
    setInputValue("");
  };

  const handlePromptClick = (info: { data: { key: string } }) => {
    onPromptClick?.(info.data.key);
  };

  // Build bubble items from events
  const bubbleItems = useMemo(() => {
    const items: ReturnType<typeof eventToBubble>[] = [];

    // Add user requirement bubble
    if (requirement && sessionId) {
      items.push(createUserBubble(requirement, sessionId));
    }

    // Add event bubbles
    events.forEach((event) => {
      const bubble = eventToBubble(event);
      if (bubble) items.push(bubble);
    });

    // Add loading bubble if running
    if (status === "running") {
      items.push(createLoadingBubble());
    }

    return items.filter(Boolean);
  }, [events, requirement, sessionId, status]);

  // Build thought chain items from events
  const thoughtChainItems = useMemo(() => {
    if (events.length === 0 && status === "idle") {
      return null;
    }
    if (events.length === 0 && status === "running") {
      return createInitialThoughtChain();
    }
    return eventsToThoughtChain(events);
  }, [events, status]);

  // Idle state: show Welcome + Prompts
  if (status === "idle" && events.length === 0) {
    return (
      <div className="center-panel">
        <div className="center-panel-header">
          <Text strong>Agent 工作台</Text>
        </div>

        <div className="center-panel-body">
          <Welcome
            icon={<BulbOutlined style={{ fontSize: 48, color: "#1677ff" }} />}
            title="开始一次测试设计任务"
            description="输入需求描述，或选择快捷任务入口"
            style={{ marginBottom: 32 }}
          />

          <Prompts
            title="快捷任务"
            items={WELCOME_PROMPTS}
            onItemClick={handlePromptClick}
            styles={{
              item: {
                flex: "none",
                width: "calc(50% - 8px)",
              },
            }}
          />
        </div>

        <div className="center-panel-footer">
          <Sender
            value={inputValue}
            onChange={setInputValue}
            onSubmit={handleSubmit}
            placeholder="输入需求描述..."
          />
        </div>
      </div>
    );
  }

  // Running/Completed/Failed state: show Bubble + ThoughtChain
  return (
    <div className="center-panel">
      <div className="center-panel-header">
        <Space>
          <Text strong>Agent 工作台</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {status === "running" && "分析中..."}
            {status === "completed" && "分析完成"}
            {status === "failed" && "分析失败"}
          </Text>
        </Space>
      </div>

      <div className="center-panel-body">
        {/* ThoughtChain - execution stages */}
        {thoughtChainItems && thoughtChainItems.length > 0 && (
          <div style={{ marginBottom: 24 }}>
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

        {/* Bubble list - conversation flow */}
        <Bubble.List
          items={bubbleItems.map((item) => item && {
            key: item.key,
            content: item.content,
            placement: item.placement,
            role: item.role,
            avatar: item.avatar,
            loading: item.loading,
          }).filter(Boolean) as any[]}
        />
      </div>

      <div className="center-panel-footer">
        <Sender
          value={inputValue}
          onChange={setInputValue}
          onSubmit={handleSubmit}
          placeholder={status === "running" ? "等待分析完成..." : "补充说明或继续分析..."}
          disabled={status === "running"}
        />
      </div>
    </div>
  );
}
