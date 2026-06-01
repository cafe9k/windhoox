import React from "react";
import "./InsightCard.css";

interface InsightCardProps {
  businessRule?: string;
  risk?: string;
  evidence?: string;
  confidence: "high" | "medium" | "low";
}

const confidenceMap = {
  high: "高",
  medium: "中",
  low: "低"
};

export function InsightCard({
  businessRule,
  risk,
  evidence,
  confidence
}: InsightCardProps) {
  return (
    <div className={`insight-card insight-${confidence}`}>
      {businessRule && (
        <div className="insight-section">
          <strong>业务规则:</strong>
          <p>{businessRule}</p>
        </div>
      )}
      {risk && (
        <div className="insight-section">
          <strong>风险:</strong>
          <p>{risk}</p>
        </div>
      )}
      {evidence && (
        <div className="insight-section">
          <strong>证据:</strong>
          <p>{evidence}</p>
        </div>
      )}
      <div className="confidence-badge">
        信心度: <strong>{confidenceMap[confidence]}</strong>
      </div>
    </div>
  );
}
