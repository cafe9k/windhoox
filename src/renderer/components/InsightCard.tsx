import { Card, Tag, Typography } from "antd";

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
  confidence
}: InsightCardProps) {
  const conf = confidenceMap[confidence];

  return (
    <Card
      data-testid="insight-card"
      size="small"
      styles={{
        body: { padding: 12 },
      }}
      style={{
        marginBottom: 12,
        borderLeft: `3px solid ${
          confidence === "high" ? "#52c41a" : confidence === "medium" ? "#faad14" : "#1890ff"
        }`,
      }}
    >
      {businessRule && (
        <div style={{ marginBottom: 8 }}>
          <Typography.Text type="secondary" style={{ fontSize: 12, fontWeight: 600 }}>
            业务规则
          </Typography.Text>
          <Typography.Paragraph style={{ margin: 0, marginTop: 4, fontSize: 13 }}>
            {businessRule}
          </Typography.Paragraph>
        </div>
      )}

      {risk && (
        <div style={{ marginBottom: 8 }}>
          <Typography.Text type="secondary" style={{ fontSize: 12, fontWeight: 600 }}>
            风险
          </Typography.Text>
          <Typography.Paragraph style={{ margin: 0, marginTop: 4, fontSize: 13 }}>
            {risk}
          </Typography.Paragraph>
        </div>
      )}

      {evidence && (
        <div style={{ marginBottom: 8 }}>
          <Typography.Text type="secondary" style={{ fontSize: 12, fontWeight: 600 }}>
            证据
          </Typography.Text>
          <Typography.Paragraph style={{ margin: 0, marginTop: 4, fontSize: 13 }}>
            {evidence}
          </Typography.Paragraph>
        </div>
      )}

      <div style={{ borderTop: "1px solid #f0f0f0", paddingTop: 8, marginTop: 4 }}>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          信心度: <Tag color={conf.color}>{conf.text}</Tag>
        </Typography.Text>
      </div>
    </Card>
  );
}
