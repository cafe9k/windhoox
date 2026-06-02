import { Typography, Tabs, Empty, Badge, Space, Button, Tag } from "antd";
import {
  ExperimentOutlined,
  CheckCircleOutlined,
  QuestionCircleOutlined,
  ExportOutlined,
} from "@ant-design/icons";
import { TestCaseCard } from "./TestCaseCard";
import { CoverageMatrix } from "./CoverageMatrix";

const { Text } = Typography;

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

interface CoverageEntry {
  requirementId: string;
  caseIds: string[];
}

interface TestArtifactPanelProps {
  cases?: TestCase[];
  coverage?: CoverageEntry[];
  questions?: Array<{
    id: string;
    category: "product" | "engineering" | "qa";
    question: string;
  }>;
  onCaseStatusChange?: (caseId: string, status: CaseStatus) => void;
  onExport?: () => void;
}

export function TestArtifactPanel({
  cases = [],
  coverage = [],
  questions = [],
  onCaseStatusChange,
  onExport,
}: TestArtifactPanelProps) {
  // Calculate counts
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

  const handleStatusChange = (caseId: string, status: CaseStatus) => {
    onCaseStatusChange?.(caseId, status);
  };

  const tabItems = [
    {
      key: "candidates",
      label: (
        <Badge count={counts.total} size="small" offset={[8, 0]} showZero>
          候选用例
        </Badge>
      ),
      children: cases.length > 0 ? (
        <div>
          {cases.map((testCase) => (
            <TestCaseCard
              key={testCase.id}
              testCase={testCase}
              onStatusChange={handleStatusChange}
            />
          ))}
          {counts.total > 0 && (
            <div style={{ marginTop: 16, textAlign: "center" }}>
              <Space>
                <Button
                  type="primary"
                  onClick={() => {
                    cases.forEach((c) => {
                      if (c.status === "pending") {
                        handleStatusChange(c.id, "accepted");
                      }
                    });
                  }}
                  disabled={counts.pending === 0}
                >
                  全部接受
                </Button>
                <Button icon={<ExportOutlined />} onClick={onExport}>
                  导出
                </Button>
              </Space>
            </div>
          )}
        </div>
      ) : (
        <Empty
          image={<ExperimentOutlined style={{ fontSize: 32, color: "#d9d9d9" }} />}
          imageStyle={{ height: 32 }}
          description={
            <Space direction="vertical" size={4}>
              <Text type="secondary" style={{ fontSize: 12 }}>暂无候选用例</Text>
              <Text type="secondary" style={{ fontSize: 11 }}>运行分析后生成</Text>
            </Space>
          }
        />
      ),
    },
    {
      key: "coverage",
      label: "覆盖矩阵",
      children: coverage.length > 0 ? (
        <CoverageMatrix matrix={coverage} />
      ) : (
        <Empty
          image={<CheckCircleOutlined style={{ fontSize: 32, color: "#d9d9d9" }} />}
          imageStyle={{ height: 32 }}
          description={<Text type="secondary" style={{ fontSize: 12 }}>暂无覆盖数据</Text>}
        />
      ),
    },
    {
      key: "gaps",
      label: (
        <Badge count={counts.gaps} size="small" offset={[8, 0]} showZero color="#ff4d4f">
          缺口
        </Badge>
      ),
      children: questions.length > 0 ? (
        <div>
          {questions.map((q) => (
            <div
              key={q.id}
              style={{
                padding: "12px",
                marginBottom: 8,
                background: "#fffbe6",
                borderRadius: 6,
                border: "1px solid #ffe58f",
              }}
            >
              <Space>
                <Tag color={q.category === "product" ? "warning" : q.category === "engineering" ? "processing" : "default"}>
                  {q.category === "product" ? "产品" : q.category === "engineering" ? "研发" : "QA"}
                </Tag>
                <Text style={{ fontSize: 12 }}>{q.question}</Text>
              </Space>
            </div>
          ))}
        </div>
      ) : (
        <Empty
          image={<QuestionCircleOutlined style={{ fontSize: 32, color: "#d9d9d9" }} />}
          imageStyle={{ height: 32 }}
          description={<Text type="secondary" style={{ fontSize: 12 }}>暂无覆盖缺口</Text>}
        />
      ),
    },
  ];

  return (
    <div className="right-panel">
      <div className="right-panel-header">
        <Space>
          <ExperimentOutlined />
          <Text strong>测试资产池</Text>
        </Space>
        <Space size={12} style={{ fontSize: 12 }}>
          <Text type="secondary">候选 <Text strong>{counts.total}</Text></Text>
          <Text type="secondary">已接受 <Text strong style={{ color: "#52c41a" }}>{counts.accepted}</Text></Text>
          <Text type="secondary">待确认 <Text strong style={{ color: "#faad14" }}>{counts.pending}</Text></Text>
          <Text type="secondary">缺口 <Text strong style={{ color: "#ff4d4f" }}>{counts.gaps}</Text></Text>
        </Space>
      </div>

      <div className="right-panel-body">
        <Tabs items={tabItems} size="small" />
      </div>
    </div>
  );
}
