import { Card, Tag } from "antd";

interface InsightCardProps {
  businessRule?: string;
  risk?: string;
  evidence?: string;
  confidence: "high" | "medium" | "low";
}

const confidenceMap = {
  high: { text: "高", color: "success" as const },
  medium: { text: "中", color: "warning" as const },
  low: { text: "低", color: "blue" as const },
};

export function InsightCard({
  businessRule,
  risk,
  evidence,
  confidence,
}: InsightCardProps) {
  const conf = confidenceMap[confidence];

  return (
    <Card
      data-testid="insight-card"
      size="small"
      className={`wh-insight-card wh-insight-card--${confidence}`}
      style={{
        marginBottom: 10,
        borderRadius: "var(--radius-md)",
      }}
    >
      {businessRule && (
        <div style={{ marginBottom: 10 }}>
          <span className="wh-insight-label">业务规则</span>
          <p className="wh-insight-text">{businessRule}</p>
        </div>
      )}

      {risk && (
        <div style={{ marginBottom: 10 }}>
          <span className="wh-insight-label">风险</span>
          <p className="wh-insight-text">{risk}</p>
        </div>
      )}

      {evidence && (
        <div style={{ marginBottom: 10 }}>
          <span className="wh-insight-label">证据</span>
          <p className="wh-insight-text">{evidence}</p>
        </div>
      )}

      <div className="wh-insight-footer">
        信心度: <Tag color={conf.color}>{conf.text}</Tag>
      </div>
    </Card>
  );
}
