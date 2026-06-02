import { Card, Tag, Space, Button, Typography, Dropdown } from "antd";
import type { MenuProps } from "antd";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  QuestionCircleOutlined,
  EditOutlined,
  MoreOutlined,
  DownOutlined,
} from "@ant-design/icons";

const { Text, Paragraph } = Typography;

type CaseStatus = "pending" | "accepted" | "rejected" | "ask_product" | "ask_engineering" | "needs_context";

interface TestCase {
  id: string;
  title: string;
  description: string;
  preconditions: string[];
  steps: string[];
  expectedResult: string;
  status: CaseStatus;
}

interface TestCaseCardProps {
  testCase: TestCase;
  onStatusChange: (caseId: string, status: CaseStatus) => void;
}

const statusConfig: Record<CaseStatus, { color: string; label: string }> = {
  pending: { color: "default", label: "待评审" },
  accepted: { color: "success", label: "已接受" },
  rejected: { color: "error", label: "已驳回" },
  ask_product: { color: "warning", label: "问产品" },
  ask_engineering: { color: "processing", label: "问研发" },
  needs_context: { color: "warning", label: "需补充" },
};

export function TestCaseCard({ testCase, onStatusChange }: TestCaseCardProps) {
  const status = statusConfig[testCase.status];

  const actionItems: MenuProps["items"] = [
    {
      key: "ask_product",
      icon: <QuestionCircleOutlined />,
      label: "问产品",
      onClick: () => onStatusChange(testCase.id, "ask_product"),
    },
    {
      key: "ask_engineering",
      icon: <QuestionCircleOutlined />,
      label: "问研发",
      onClick: () => onStatusChange(testCase.id, "ask_engineering"),
    },
    {
      key: "needs_context",
      icon: <EditOutlined />,
      label: "补充资料",
      onClick: () => onStatusChange(testCase.id, "needs_context"),
    },
  ];

  return (
    <Card
      size="small"
      title={
        <Space>
          <Tag color="blue">{testCase.id}</Tag>
          <Text strong style={{ fontSize: 13 }}>{testCase.title}</Text>
        </Space>
      }
      extra={<Tag color={status.color}>{status.label}</Tag>}
      style={{ marginBottom: 12 }}
    >
      <Paragraph style={{ fontSize: 12, marginBottom: 12 }}>
        {testCase.description}
      </Paragraph>

      {testCase.preconditions.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <Text type="secondary" style={{ fontSize: 11 }}>前置条件：</Text>
          <ul style={{ margin: "4px 0", paddingLeft: 16, fontSize: 11 }}>
            {testCase.preconditions.map((pre, i) => (
              <li key={i}>{pre}</li>
            ))}
          </ul>
        </div>
      )}

      {testCase.steps.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <Text type="secondary" style={{ fontSize: 11 }}>测试步骤：</Text>
          <ol style={{ margin: "4px 0", paddingLeft: 16, fontSize: 11 }}>
            {testCase.steps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </div>
      )}

      <div style={{ marginBottom: 12 }}>
        <Text type="secondary" style={{ fontSize: 11 }}>预期结果：</Text>
        <Paragraph style={{ fontSize: 11, marginTop: 4, marginBottom: 0 }}>
          {testCase.expectedResult}
        </Paragraph>
      </div>

      {testCase.status === "pending" && (
        <Space>
          <Button
            type="primary"
            size="small"
            icon={<CheckCircleOutlined />}
            onClick={() => onStatusChange(testCase.id, "accepted")}
          >
            接受
          </Button>
          <Button
            size="small"
            icon={<CloseCircleOutlined />}
            onClick={() => onStatusChange(testCase.id, "rejected")}
          >
            驳回
          </Button>
          <Dropdown menu={{ items: actionItems }}>
            <Button size="small">
              更多 <DownOutlined />
            </Button>
          </Dropdown>
        </Space>
      )}

      {testCase.status !== "pending" && testCase.status !== "accepted" && testCase.status !== "rejected" && (
        <Button
          size="small"
          onClick={() => onStatusChange(testCase.id, "pending")}
        >
          重置
        </Button>
      )}
    </Card>
  );
}
