import React from "react";
import "./InsightCard.css";

interface InsightCardProps {
  businessRule?: string;
  risk?: string;
  evidence?: string;
  confidence: "high" | "medium" | "low";
}

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
          <strong>Business Rule:</strong>
          <p>{businessRule}</p>
        </div>
      )}
      {risk && (
        <div className="insight-section">
          <strong>Risk:</strong>
          <p>{risk}</p>
        </div>
      )}
      {evidence && (
        <div className="insight-section">
          <strong>Evidence:</strong>
          <p>{evidence}</p>
        </div>
      )}
      <div className="confidence-badge">
        Confidence: <strong>{confidence.toUpperCase()}</strong>
      </div>
    </div>
  );
}
