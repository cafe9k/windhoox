import { useState } from "react";
import { Card, Button, Input, Space, Row, Col, Statistic } from "antd";
import { ReloadOutlined, CloseOutlined } from "@ant-design/icons";
import type { AgentState } from "../state/agent-state";

interface ContinueAnalysisButtonProps {
  state: AgentState;
  onContinue: (payload: {
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
    followUpPrompt?: string;
  }) => Promise<void>;
}

export function ContinueAnalysisButton({
  state,
  onContinue,
}: ContinueAnalysisButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [followUpPrompt, setFollowUpPrompt] = useState("");
  const [showPromptInput, setShowPromptInput] = useState(false);

  const acceptedCaseIds = state.cases
    .filter((c) => c.status === "accepted")
    .map((c) => c.id);

  const rejectedCaseIds = state.cases
    .filter((c) => c.status === "rejected")
    .map((c) => c.id);

  const reviewedCount = acceptedCaseIds.length + rejectedCaseIds.length;
  const unresolvedQuestions = state.questions;

  const hasCases = state.cases.length > 0;

  const handleClick = async () => {
    setIsLoading(true);
    try {
      await onContinue({
        sessionId: state.sessionId,
        previousSessionId: state.sessionId,
        feedback: {
          acceptedCaseIds,
          rejectedCaseIds,
          unresolvedQuestions: unresolvedQuestions.map((q) => ({
            id: q.id,
            category: q.category,
            text: q.question,
          })),
        },
        followUpPrompt: followUpPrompt.trim() || undefined,
      });
    } finally {
      setIsLoading(false);
      setShowPromptInput(false);
      setFollowUpPrompt("");
    }
  };

  return (
    <Card
      size="small"
      style={{
        marginBottom: 16,
        border: "1px solid rgba(0, 102, 184, 0.2)",
        borderRadius: "var(--radius-md)",
        background: "var(--accent-light)",
      }}
    >
      <Row gutter={16} style={{ marginBottom: 12 }}>
        <Col span={12}>
          <Statistic
            data-testid="summary-reviewed"
            title="已审核"
            value={`${reviewedCount} 个测试用例`}
            valueStyle={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}
          />
        </Col>
        <Col span={12}>
          <Statistic
            data-testid="summary-questions"
            title="待澄清"
            value={`${unresolvedQuestions.length} 个问题`}
            valueStyle={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}
          />
        </Col>
      </Row>

      {showPromptInput ? (
        <Space direction="vertical" style={{ width: "100%" }}>
          <Input.TextArea
            data-testid="prompt-textarea"
            placeholder="添加额外的说明或问题（可选）..."
            value={followUpPrompt}
            onChange={(e) => setFollowUpPrompt(e.target.value)}
            rows={3}
            style={{
              borderRadius: "var(--radius-sm)",
              fontFamily: "var(--font-mono)",
              fontSize: 13,
              borderColor: "var(--border-strong)",
            }}
          />
          <Space style={{ width: "100%", justifyContent: "flex-end" }}>
            <Button
              data-testid="cancel-button"
              icon={<CloseOutlined />}
              onClick={() => {
                setShowPromptInput(false);
                setFollowUpPrompt("");
              }}
              disabled={isLoading}
              size="small"
            >
              取消
            </Button>
            <Button
              data-testid="continue-button"
              type="primary"
              icon={<ReloadOutlined />}
              onClick={handleClick}
              disabled={isLoading || !hasCases}
              loading={isLoading}
              size="small"
            >
              {isLoading ? "分析中..." : "继续分析"}
            </Button>
          </Space>
        </Space>
      ) : (
        <Button
          data-testid="continue-button"
          type="primary"
          icon={<ReloadOutlined />}
          onClick={() => setShowPromptInput(true)}
          disabled={isLoading || !hasCases}
          block
          size="small"
        >
          {isLoading ? "分析中..." : "继续分析"}
        </Button>
      )}
    </Card>
  );
}
