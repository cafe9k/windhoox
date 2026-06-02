import { useState } from "react";
import { Button, Space } from "antd";
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

const statusConfig: Record<TestCase["status"], { label: string; dotClass: string }> = {
  pending: { label: "待审核", dotClass: "wh-status-dot--default" },
  accepted: { label: "已接受", dotClass: "wh-status-dot--success" },
  rejected: { label: "已拒绝", dotClass: "wh-status-dot--error" },
  ask_product: { label: "询问产品", dotClass: "wh-status-dot--warning" },
  ask_engineering: { label: "询问工程", dotClass: "wh-status-dot--warning" },
  needs_context: { label: "需要上下文", dotClass: "wh-status-dot--info" },
};

export function TestCaseCard({ testCase, onStatusChange }: TestCaseCardProps) {
  const [expanded, setExpanded] = useState(false);
  const config = statusConfig[testCase.status];

  return (
    <div
      data-testid="test-case-card"
      className="wh-case-card"
      style={{
        marginBottom: 6,
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)",
        overflow: "hidden",
        background: "var(--bg-main)",
      }}
    >
      <div
        data-testid="case-header"
        onClick={() => setExpanded(!expanded)}
        className={`wh-case-header ${expanded ? "wh-case-header--expanded" : ""}`}
        style={{
          padding: "8px 12px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          cursor: "pointer",
          userSelect: "none",
          borderBottom: expanded ? "1px solid var(--border)" : "1px solid transparent",
        }}
      >
        <Space>
          <span
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: "var(--text-primary)",
              fontFamily: "var(--font-mono)",
            }}
          >
            {testCase.title}
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--text-muted)" }}>
            <span className={`wh-status-dot ${config.dotClass}`} />
            {config.label}
          </span>
        </Space>
        {expanded ? (
          <CaretDownOutlined style={{ color: "var(--text-muted)", fontSize: 12 }} />
        ) : (
          <CaretRightOutlined style={{ color: "var(--text-muted)", fontSize: 12 }} />
        )}
      </div>

      {expanded && (
        <div style={{ padding: "10px 12px", background: "var(--bg-panel)" }}>
          <div className="wh-case-section" style={{ marginBottom: 10 }}>
            <span className="wh-case-section-title">描述</span>
            <p className="wh-case-section-content">{testCase.description}</p>
          </div>

          {testCase.preconditions.length > 0 && (
            <div className="wh-case-section" style={{ marginBottom: 10 }}>
              <span className="wh-case-section-title">前置条件</span>
              <ul className="wh-case-list">
                {testCase.preconditions.map((pc, i) => (
                  <li key={i}>{pc}</li>
                ))}
              </ul>
            </div>
          )}

          {testCase.steps.length > 0 && (
            <div className="wh-case-section" style={{ marginBottom: 10 }}>
              <span className="wh-case-section-title">步骤</span>
              <ol className="wh-case-list">
                {testCase.steps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </div>
          )}

          <div className="wh-case-section" style={{ marginBottom: 10 }}>
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
    </div>
  );
}
