import { Welcome, Prompts, Sender, Bubble } from "@ant-design/x";
import { FileTextOutlined, BulbOutlined, SearchOutlined, CheckSquareOutlined, ThunderboltOutlined } from "@ant-design/icons";
import { useState, useMemo } from "react";
import { Typography, Space } from "antd";
import { eventToBubble, createUserBubble, createLoadingBubble } from "./eventToBubble";
import { AnalysisProgressCard } from "./AnalysisProgressCard";
import { AgentProgressBadge } from "./AgentProgressBadge";
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
  {
    key: "demo",
    label: "Demo 演示",
    description: "加载电商支付场景需求",
    icon: <ThunderboltOutlined style={{ color: "#eb2f96" }} />,
  },
];

const DEMO_REQUIREMENT = `【需求背景】
公司正在开发一套电商平台的支付系统，用户可以在购物车中选择商品后，进入支付流程完成订单。

【功能需求】
1. 支付渠道：系统支持支付宝、微信支付和银行卡支付三种支付方式。用户可以在支付页面选择任意一种支付方式完成付款。
2. 安全验证：订单金额大于200元时，系统必须要求用户进行短信验证码二次验证。验证码有效期为5分钟，连续输错3次后需要重新获取，60秒内只能发送一次验证码。
3. 支付超时：用户发起支付后，如果在15分钟内未完成支付，订单自动取消并释放库存。
4. 并发控制：同一用户在同一时刻对同一订单发起多次支付请求时，系统应仅允许一个支付请求进入第三方支付渠道，其余请求返回「支付处理中」。
5. 异步回调：第三方支付渠道的异步回调必须实现幂等校验，同一笔订单的重复回调不应导致重复扣款或重复发通知。
6. 通知机制：支付成功后需向用户注册邮箱发送确认邮件，邮件内容包含订单号、商品清单、支付金额、支付时间。邮件发送失败不应阻塞订单状态更新，但需记录失败日志并进入重试队列。
7. 退款流程：用户支付成功后可立即申请退款，退款原路退回到原支付渠道，退款金额不得超过原订单实付金额。

【非功能需求】
- 支付接口响应时间不超过3秒
- 系统需要支持至少1000并发支付请求
- 所有支付流水需要保留至少3年用于审计

【相关接口】
- POST /api/v1/payments — 创建支付
- POST /api/v1/payments/callback — 支付回调
- POST /api/v1/payments/refund — 申请退款
- GET /api/v1/payments/{id} — 查询支付状态`;

type SessionStatus = "idle" | "running" | "completed" | "failed";

interface AgentConversationPanelProps {
  requirement?: string;
  sessionId?: string;
  events?: AgentEvent[];
  status?: SessionStatus;
  cases?: Array<{
    id: string;
    title: string;
    description: string;
    preconditions: string[];
    steps: string[];
    expectedResult: string;
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
  /** Round number for multi-turn conversations. */
  round?: number;
  onSubmit?: (requirement: string) => void;
  onPromptClick?: (key: string) => void;
  onViewDetails?: () => void;
  /** Called when user wants to continue analysis from current completed/failed session. */
  onContinueAnalysis?: (feedback: string) => void;
}

export function AgentConversationPanel({
  requirement,
  sessionId,
  events = [],
  status = "idle",
  cases = [],
  coverage = [],
  questions = [],
  round = 1,
  onSubmit,
  onPromptClick,
  onViewDetails,
  onContinueAnalysis,
}: AgentConversationPanelProps) {
  const [inputValue, setInputValue] = useState("");

  const handleSubmit = (value: string) => {
    if (!value.trim()) return;
    onSubmit?.(value);
    setInputValue("");
  };

  const handleContinueSubmit = (value: string) => {
    if (!value.trim()) return;
    onContinueAnalysis?.(value);
    setInputValue("");
  };

  const handlePromptClick = (info: { data: { key: string } }) => {
    if (info.data.key === "demo") {
      setInputValue(DEMO_REQUIREMENT);
      return;
    }
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

  // Idle state: show Welcome + Prompts
  if (status === "idle" && events.length === 0) {
    return (
      <div className="center-panel">
        <div className="center-panel-header">
          <Space>
            <Text strong>Agent 工作台</Text>
            <AgentProgressBadge status={status} events={events} />
          </Space>
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
            items={WELCOME_PROMPTS.slice(0, 4)}
            onItemClick={handlePromptClick}
            styles={{
              item: {
                flex: "none",
                width: "calc(50% - 8px)",
              },
            }}
          />

          <Prompts
            items={WELCOME_PROMPTS.slice(4)}
            onItemClick={handlePromptClick}
            styles={{
              item: {
                flex: "1",
                background: "linear-gradient(135deg, #fff0f6 0%, #fce7f3 100%)",
                border: "1px solid #ffadd2",
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
          <AgentProgressBadge status={status} events={events} />
        </Space>
      </div>

      <div className="center-panel-body">
        {/* Analysis Progress Card - wraps progress and summary */}
        <AnalysisProgressCard
          status={status}
          events={events}
          cases={cases}
          coverage={coverage}
          questions={questions}
          onViewDetails={onViewDetails}
          onContinueAnalysis={onContinueAnalysis ? () => onContinueAnalysis("") : undefined}
        />

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
        {status === "completed" || status === "failed" ? (
          <Sender
            value={inputValue}
            onChange={setInputValue}
            onSubmit={handleContinueSubmit}
            placeholder={
              round > 1
                ? `第 ${round} 轮分析已完成，输入反馈继续优化...`
                : "分析已完成，输入反馈继续优化..."
            }
          />
        ) : (
          <Sender
            value={inputValue}
            onChange={setInputValue}
            onSubmit={handleSubmit}
            placeholder={status === "running" ? "等待分析完成..." : "补充说明或继续分析..."}
            disabled={status === "running"}
          />
        )}
      </div>
    </div>
  );
}
