import { useState } from "react";
import { Card, Tag, Button, Space } from "antd";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  QuestionCircleOutlined,
  CaretRightOutlined,
  CaretDownOutlined,
} from "@ant-design/icons";

interface TestCase {
  id: string;
  title: string;
  description: string;
  preconditions: string[];
  steps: string[];
  expectedResult: string;
  status: "pending" | "accepted" | "rejected" | "ask_product" | "ask_engineering" | "needs_context";
}

interface TestCaseCardProps {
  testCase: TestCase;
  onStatusChange: (caseId: string, status: TestCase["status"]) => void;
}

const statusConfig: Record<TestCase["status"], { label: string; color: string }> = {
  pending: { label: "待审核", color: "default" },
  accepted: { label: "已接受", color: "success" },
  rejected: { label: "已拒绝", color: "error" },
  ask_product: { label: "询问产品", color: "warning" },
  ask_engineering: { label: "询问工程", color: "warning" },
  needs_context: { label: "需要上下文", color: "processing" },
};

export function TestCaseCard({ testCase, onStatusChange }: TestCaseCardProps) {
  const [expanded, setExpanded] = useState(false);
  const config = statusConfig[testCase.status];

  return (
    <Card
      data-testid="test-case-card"
      size="small"
      className="wh-case-card"
      styles={{ body: { padding: 0 } }}
    >
      <div
        data-testid="case-header"
        onClick={() => setExpanded(!expanded)}
        className={`wh-case-header ${expanded ? "wh-case-header--expanded" : ""}`}
      >
        <Space>
          <span className="wh-case-title">{testCase.title}</span>
          <Tag color={config.color} className="wh-status-tag">
            {config.label}
          </Tag>
        </Space>
        {expanded ? (
          <CaretDownOutlined style={{ color: "var(--color-text-muted)" }} />
        ) : (
          <CaretRightOutlined style={{ color: "var(--color-text-muted)" }} />
        )}
      </div>

      {expanded && (
        <div className="wh-case-body">
          <div className="wh-case-section">
            <span className="wh-case-section-title">描述</span>
            <p className="wh-case-section-content">{testCase.description}</p>
          </div>

          {testCase.preconditions.length > 0 && (
            <div className="wh-case-section">
              <span className="wh-case-section-title">前置条件</span>
              <ul className="wh-case-list">
                {testCase.preconditions.map((pc, i) => (
                  <li key={i}>{pc}</li>
                ))}
              </ul>
            </div>
          )}

          {testCase.steps.length > 0 && (
            <div className="wh-case-section">
              <span className="wh-case-section-title">步骤</span>
              <ol className="wh-case-list">
                {testCase.steps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </div>
          )}

          <div className="wh-case-section">
            <span className="wh-case-section-title">预期结果</span>
            <p className="wh-case-section-content">{testCase.expectedResult}</p>
          </div>

          <div className="wh-case-actions">
            <Button
              data-testid="accept-btn"
              type="primary"
              icon={<CheckCircleOutlined />}
              onClick={() => onStatusChange(testCase.id, "accepted")}
              size="small"
            >
              接受
            </Button>
            <Button
              data-testid="reject-btn"
              danger
              icon={<CloseCircleOutlined />}
              onClick={() => onStatusChange(testCase.id, "rejected")}
              size="small"
            >
              拒绝
            </Button>
            <Button
              data-testid="clarify-btn"
              icon={<QuestionCircleOutlined />}
              onClick={() => onStatusChange(testCase.id, "ask_product")}
              size="small"
            >
              澄清
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
