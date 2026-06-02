import { Tag } from "antd";
import { BulbOutlined } from "@ant-design/icons";

interface Insight {
  id: string;
  businessRule?: string;
  risk?: string;
  evidence?: string;
  confidence: "high" | "medium" | "low";
}

interface InsightMessageProps {
  insights: Insight[];
}

const confMap = {
  high:   { text: "高", color: "success" as const, accent: "var(--status-success)" },
  medium: { text: "中", color: "warning" as const, accent: "var(--status-warning)" },
  low:    { text: "低", color: "processing" as const, accent: "var(--status-info)" },
};

export function InsightMessage({ insights }: InsightMessageProps) {
  if (!insights.length) return null;

  return (
    <div className="wh-msg-insight-block wh-animate-in" data-testid="insight-message">
      <div className="wh-msg-insight-header">
        <BulbOutlined />
        分析洞察 ({insights.length})
      </div>
      {insights.map((ins) => {
        const conf = confMap[ins.confidence];
        const text = ins.businessRule || ins.risk || ins.evidence || "";
        return (
          <div key={ins.id} className="wh-msg-insight-item" data-testid="insight-item">
            <div
              className="wh-msg-insight-accent"
              style={{ background: conf.accent }}
            />
            <div className="wh-msg-insight-content">
              <p className="wh-msg-insight-rule">{text}</p>
              <div className="wh-msg-insight-meta">
                信心度：<Tag color={conf.color}>{conf.text}</Tag>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
