import { useState } from "react";
import { Card, Tag, Button, Space, Typography, Divider } from "antd";
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
      style={{ marginBottom: 8 }}
      styles={{ body: { padding: 0 } }}
    >
      <div
        data-testid="case-header"
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: "10px 12px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        <Space>
          <Typography.Text strong style={{ fontSize: 13 }}>
            {testCase.title}
          </Typography.Text>
          <Tag color={config.color}>{config.label}</Tag>
        </Space>
        {expanded ? <CaretDownOutlined /> : <CaretRightOutlined />}
      </div>

      {expanded && (
        <div style={{ padding: "0 12px 12px" }}>
          <Divider style={{ margin: "8px 0" }} />

          <div style={{ marginBottom: 12 }}>
            <Typography.Text type="secondary" style={{ fontSize: 12, fontWeight: 600 }}>
              描述
            </Typography.Text>
            <Typography.Paragraph style={{ margin: "4px 0 0", fontSize: 13 }}>
              {testCase.description}
            </Typography.Paragraph>
          </div>

          {testCase.preconditions.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <Typography.Text type="secondary" style={{ fontSize: 12, fontWeight: 600 }}>
                前置条件
              </Typography.Text>
              <ul style={{ margin: "4px 0 0", paddingLeft: 20, fontSize: 13 }}>
                {testCase.preconditions.map((pc, i) => (
                  <li key={i}>{pc}</li>
                ))}
              </ul>
            </div>
          )}

          {testCase.steps.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <Typography.Text type="secondary" style={{ fontSize: 12, fontWeight: 600 }}>
                步骤
              </Typography.Text>
              <ol style={{ margin: "4px 0 0", paddingLeft: 20, fontSize: 13 }}>
                {testCase.steps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </div>
          )}

          <div style={{ marginBottom: 12 }}>
            <Typography.Text type="secondary" style={{ fontSize: 12, fontWeight: 600 }}>
              预期结果
            </Typography.Text>
            <Typography.Paragraph style={{ margin: "4px 0 0", fontSize: 13 }}>
              {testCase.expectedResult}
            </Typography.Paragraph>
          </div>

          <Space style={{ width: "100%" }}>
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
          </Space>
        </div>
      )}
    </Card>
  );
}
