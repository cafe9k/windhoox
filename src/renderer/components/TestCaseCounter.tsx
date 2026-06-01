import "./TestCaseCounter.css";

interface TestCaseCounterProps {
  counts: {
    pending: number;
    accepted: number;
    rejected: number;
    needsClarification: number;
  };
}

export function TestCaseCounter({ counts }: TestCaseCounterProps) {
  return (
    <div className="test-case-counter">
      <div className="counter-item counter-pending">
        <span className="counter-label">待审核:</span>
        <span className="counter-value">{counts.pending}</span>
      </div>
      <div className="counter-item counter-accepted">
        <span className="counter-label">已接受:</span>
        <span className="counter-value">{counts.accepted}</span>
      </div>
      <div className="counter-item counter-rejected">
        <span className="counter-label">已拒绝:</span>
        <span className="counter-value">{counts.rejected}</span>
      </div>
      <div className="counter-item counter-clarification">
        <span className="counter-label">需要澄清:</span>
        <span className="counter-value">{counts.needsClarification}</span>
      </div>
    </div>
  );
}
