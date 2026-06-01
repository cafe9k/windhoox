import React, { useState } from "react";
import "./TestCaseCard.css";

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

const statusLabel = {
  pending: "待审核",
  accepted: "已接受",
  rejected: "已拒绝",
  ask_product: "询问产品",
  ask_engineering: "询问工程",
  needs_context: "需要上下文"
};

export function TestCaseCard({ testCase, onStatusChange }: TestCaseCardProps) {
  const [expanded, setExpanded] = useState(false);

  const statusClass = testCase.status.replace(/_/g, "-");

  return (
    <div className={`test-case-card test-case-${statusClass}`}>
      <div className="case-header" onClick={() => setExpanded(!expanded)}>
        <div className="case-title-section">
          <strong className="case-title">{testCase.title}</strong>
          <span className={`case-status case-status-${statusClass}`}>
            {statusLabel[testCase.status]}
          </span>
        </div>
        <span className="expand-icon">{expanded ? "−" : "+"}</span>
      </div>

      {expanded && (
        <div className="case-content">
          <div className="case-section">
            <strong>描述:</strong>
            <p>{testCase.description}</p>
          </div>

          {testCase.preconditions.length > 0 && (
            <div className="case-section">
              <strong>前置条件:</strong>
              <ul>
                {testCase.preconditions.map((pc, i) => (
                  <li key={i}>{pc}</li>
                ))}
              </ul>
            </div>
          )}

          {testCase.steps.length > 0 && (
            <div className="case-section">
              <strong>步骤:</strong>
              <ol>
                {testCase.steps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </div>
          )}

          <div className="case-section">
            <strong>预期结果:</strong>
            <p>{testCase.expectedResult}</p>
          </div>

          <div className="case-actions">
            <button
              className="action-btn accept-btn"
              onClick={() => onStatusChange(testCase.id, "accepted")}
            >
              接受
            </button>
            <button
              className="action-btn reject-btn"
              onClick={() => onStatusChange(testCase.id, "rejected")}
            >
              拒绝
            </button>
            <button
              className="action-btn clarify-btn"
              onClick={() => onStatusChange(testCase.id, "ask_product")}
            >
              澄清
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
