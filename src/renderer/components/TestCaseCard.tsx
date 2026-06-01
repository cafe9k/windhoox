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

export function TestCaseCard({ testCase, onStatusChange }: TestCaseCardProps) {
  const [expanded, setExpanded] = useState(false);

  const statusLabel = {
    pending: "Pending",
    accepted: "Accepted",
    rejected: "Rejected",
    ask_product: "Ask Product",
    ask_engineering: "Ask Engineering",
    needs_context: "Needs Context"
  };

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
            <strong>Description:</strong>
            <p>{testCase.description}</p>
          </div>

          {testCase.preconditions.length > 0 && (
            <div className="case-section">
              <strong>Preconditions:</strong>
              <ul>
                {testCase.preconditions.map((pc, i) => (
                  <li key={i}>{pc}</li>
                ))}
              </ul>
            </div>
          )}

          {testCase.steps.length > 0 && (
            <div className="case-section">
              <strong>Steps:</strong>
              <ol>
                {testCase.steps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </div>
          )}

          <div className="case-section">
            <strong>Expected Result:</strong>
            <p>{testCase.expectedResult}</p>
          </div>

          <div className="case-actions">
            <button
              className="action-btn accept-btn"
              onClick={() => onStatusChange(testCase.id, "accepted")}
            >
              Accept
            </button>
            <button
              className="action-btn reject-btn"
              onClick={() => onStatusChange(testCase.id, "rejected")}
            >
              Reject
            </button>
            <button
              className="action-btn clarify-btn"
              onClick={() => onStatusChange(testCase.id, "ask_product")}
            >
              Clarify
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
