import { Tag } from "antd";

interface InsightCardProps {
  businessRule?: string;
  risk?: string;
  evidence?: string;
  confidence: "high" | "medium" | "low";
}

const confidenceMap = {
  high: { text: "高", color: "success" as const, dotClass: "wh-status-dot--success" },
  medium: { text: "中", color: "warning" as const, dotClass: "wh-status-dot--warning" },
  low: { text: "低", color: "blue" as const, dotClass: "wh-status-dot--info" },
};

export function InsightCard({
  businessRule,
  risk,
  evidence,
  confidence,
}: InsightCardProps) {
  const conf = confidenceMap[confidence];

  return (
    <div
      data-testid="insight-card"
      className={`wh-insight-card wh-insight-card--${confidence}`}
      style={{
        marginBottom: 8,
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--border)",
        borderLeft: "none",
        background: "var(--bg-main)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Left accent bar */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 3,
          background:
            confidence === "high"
              ? "var(--status-success)"
              : confidence === "medium"
                ? "var(--status-warning)"
                : "var(--status-info)",
        }}
      />

      <div style={{ padding: "10px 14px 10px 16px" }}>
        {businessRule && (
          <div style={{ marginBottom: 8 }}>
            <span className="wh-insight-label">业务规则</span>
            <p className="wh-insight-text">{businessRule}</p>
          </div>
        )}

        {risk && (
          <div style={{ marginBottom: 8 }}>
            <span className="wh-insight-label">风险</span>
            <p className="wh-insight-text">{risk}</p>
          </div>
        )}

        {evidence && (
          <div style={{ marginBottom: 8 }}>
            <span className="wh-insight-label">证据</span>
            <p className="wh-insight-text">{evidence}</p>
          </div>
        )}

        <div
          style={{
            borderTop: "1px solid var(--border)",
            paddingTop: 6,
            marginTop: 6,
            fontSize: 12,
            color: "var(--text-muted)",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span className={`wh-status-dot ${conf.dotClass}`} />
          信心度: <Tag color={conf.color}>{conf.text}</Tag>
        </div>
      </div>
    </div>
  );
}
