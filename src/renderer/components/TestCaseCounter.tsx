interface TestCaseCounterProps {
  counts: {
    pending: number;
    accepted: number;
    rejected: number;
    needsClarification: number;
  };
}

const counters = [
  { key: "pending" as const, label: "待审核", colorClass: "wh-counter-value--pending" },
  { key: "accepted" as const, label: "已接受", colorClass: "wh-counter-value--accepted" },
  { key: "rejected" as const, label: "已拒绝", colorClass: "wh-counter-value--rejected" },
  { key: "needsClarification" as const, label: "需澄清", colorClass: "wh-counter-value--clarification" },
];

export function TestCaseCounter({ counts }: TestCaseCounterProps) {
  return (
    <div className="wh-counter-row">
      {counters.map(({ key, label, colorClass }) => (
        <div key={key} className="wh-counter-card" data-testid={`counter-${key === "needsClarification" ? "clarification" : key}`}>
          <div className={`wh-counter-value ${colorClass}`}>
            {counts[key]}
          </div>
          <div className="wh-counter-label">{label}</div>
        </div>
      ))}
    </div>
  );
}
