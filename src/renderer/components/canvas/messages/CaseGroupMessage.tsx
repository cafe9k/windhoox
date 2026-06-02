import { useState } from "react";
import { Button, Tooltip } from "antd";
import {
  CaretRightOutlined,
  CaretDownOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  QuestionCircleOutlined,
  ExperimentOutlined,
} from "@ant-design/icons";

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

interface CaseGroupMessageProps {
  cases: TestCase[];
  onStatusChange?: (caseId: string, status: CaseStatus) => void;
}

const STATUS_CHIP: Record<CaseStatus, { label: string; cls: string }> = {
  pending:          { label: "待审核", cls: "wh-msg-case-status-chip--pending" },
  accepted:         { label: "已接受", cls: "wh-msg-case-status-chip--accepted" },
  rejected:         { label: "已拒绝", cls: "wh-msg-case-status-chip--rejected" },
  ask_product:      { label: "问产品", cls: "wh-msg-case-status-chip--ask" },
  ask_engineering:  { label: "问研发", cls: "wh-msg-case-status-chip--ask" },
  needs_context:    { label: "需上下文", cls: "wh-msg-case-status-chip--ask" },
};

export function CaseGroupMessage({ cases, onStatusChange }: CaseGroupMessageProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!cases.length) return null;

  return (
    <div className="wh-msg-case-block wh-animate-in" data-testid="case-group-message">
      {/* 组头 */}
      <div className="wh-msg-case-header">
        <div className="wh-msg-case-header-title">
          <ExperimentOutlined style={{ marginRight: 6 }} />
          测试用例 ({cases.length})
        </div>
        <div className="wh-msg-case-header-actions">
          <Button
            size="small"
            type="text"
            icon={<CheckCircleOutlined />}
            style={{ color: "var(--status-success)", fontSize: 12 }}
            onClick={() => cases.forEach((c) => onStatusChange?.(c.id, "accepted"))}
          >
            全部接受
          </Button>
          <Button
            size="small"
            type="text"
            icon={<CloseCircleOutlined />}
            style={{ color: "var(--status-error)", fontSize: 12 }}
            onClick={() => cases.forEach((c) => onStatusChange?.(c.id, "rejected"))}
          >
            全部拒绝
          </Button>
        </div>
      </div>

      {/* 用例行列表 */}
      {cases.map((tc) => {
        const chip = STATUS_CHIP[tc.status];
        const isExpanded = expandedId === tc.id;

        return (
          <div key={tc.id} data-testid="case-row-item">
            {/* 折叠行 */}
            <div
              className="wh-msg-case-row"
              data-testid="case-header"
              onClick={() => setExpandedId(isExpanded ? null : tc.id)}
            >
              {isExpanded
                ? <CaretDownOutlined  style={{ color: "var(--text-muted)", fontSize: 11, marginRight: 8 }} />
                : <CaretRightOutlined style={{ color: "var(--text-muted)", fontSize: 11, marginRight: 8 }} />
              }
              <span className="wh-msg-case-row-title">{tc.title}</span>
              <span className={`wh-msg-case-status-chip ${chip.cls}`}>
                {chip.label}
              </span>
            </div>

            {/* 展开详情 */}
            {isExpanded && (
              <div className="wh-msg-case-expand">
                <span className="wh-msg-case-section-label">描述</span>
                <p className="wh-msg-case-section-text">{tc.description}</p>

                {tc.preconditions.length > 0 && (
                  <>
                    <span className="wh-msg-case-section-label">前置条件</span>
                    <ul className="wh-msg-case-section-list">
                      {tc.preconditions.map((p, i) => <li key={i}>{p}</li>)}
                    </ul>
                  </>
                )}

                {tc.steps.length > 0 && (
                  <>
                    <span className="wh-msg-case-section-label">步骤</span>
                    <ol className="wh-msg-case-section-list">
                      {tc.steps.map((s, i) => <li key={i}>{s}</li>)}
                    </ol>
                  </>
                )}

                <span className="wh-msg-case-section-label">预期结果</span>
                <p className="wh-msg-case-section-text">{tc.expectedResult}</p>

                <div className="wh-msg-case-actions">
                  <Button
                    data-testid="accept-btn"
                    type="primary"
                    size="small"
                    icon={<CheckCircleOutlined />}
                    onClick={() => onStatusChange?.(tc.id, "accepted")}
                  >
                    接受
                  </Button>
                  <Button
                    data-testid="reject-btn"
                    danger
                    size="small"
                    icon={<CloseCircleOutlined />}
                    onClick={() => onStatusChange?.(tc.id, "rejected")}
                  >
                    拒绝
                  </Button>
                  <Tooltip title="需要产品确认">
                    <Button
                      data-testid="clarify-btn"
                      size="small"
                      icon={<QuestionCircleOutlined />}
                      onClick={() => onStatusChange?.(tc.id, "ask_product")}
                    >
                      澄清
                    </Button>
                  </Tooltip>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
