import { useState } from "react";
import type { AgentState } from "../state/agent-state";
import "./ContinueAnalysisButton.css";

interface ContinueAnalysisButtonProps {
  state: AgentState;
  onContinue: (payload: {
    sessionId: string;
    previousSessionId: string;
    feedback: {
      acceptedCaseIds: string[];
      rejectedCaseIds: string[];
      unresolvedQuestions: Array<{
        id: string;
        category: string;
        text: string;
      }>;
    };
    followUpPrompt?: string;
  }) => Promise<void>;
}

export function ContinueAnalysisButton({ state, onContinue }: ContinueAnalysisButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [followUpPrompt, setFollowUpPrompt] = useState("");
  const [showPromptInput, setShowPromptInput] = useState(false);

  const acceptedCaseIds = state.cases
    .filter((c) => c.status === "accepted")
    .map((c) => c.id);

  const rejectedCaseIds = state.cases
    .filter((c) => c.status === "rejected")
    .map((c) => c.id);

  const reviewedCount = acceptedCaseIds.length + rejectedCaseIds.length;
  const unresolvedQuestions = state.questions;

  const hasCases = state.cases.length > 0;

  const handleClick = async () => {
    setIsLoading(true);
    try {
      await onContinue({
        sessionId: state.sessionId,
        previousSessionId: state.sessionId,
        feedback: {
          acceptedCaseIds,
          rejectedCaseIds,
          unresolvedQuestions: unresolvedQuestions.map((q) => ({
            id: q.id,
            category: q.category,
            text: q.question
          }))
        },
        followUpPrompt: followUpPrompt.trim() || undefined
      });
    } finally {
      setIsLoading(false);
      setShowPromptInput(false);
      setFollowUpPrompt("");
    }
  };

  return (
    <div className="continue-analysis-section">
      <div className="continue-summary">
        <div className="summary-item">
          <span className="summary-label">已审核:</span>
          <span className="summary-value">{reviewedCount} 个测试用例</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">待澄清:</span>
          <span className="summary-value">{unresolvedQuestions.length} 个问题</span>
        </div>
      </div>

      {showPromptInput ? (
        <div className="follow-up-input">
          <textarea
            className="prompt-textarea"
            placeholder="添加额外的说明或问题（可选）..."
            value={followUpPrompt}
            onChange={(e) => setFollowUpPrompt(e.target.value)}
            rows={3}
          />
          <div className="button-group">
            <button
              className="cancel-button"
              onClick={() => {
                setShowPromptInput(false);
                setFollowUpPrompt("");
              }}
              disabled={isLoading}
            >
              取消
            </button>
            <button
              className="continue-button"
              onClick={handleClick}
              disabled={isLoading || !hasCases}
            >
              {isLoading ? "分析中..." : "继续分析"}
            </button>
          </div>
        </div>
      ) : (
        <button
          className="continue-button"
          onClick={() => setShowPromptInput(true)}
          disabled={isLoading || !hasCases}
        >
          {isLoading ? "分析中..." : "继续分析"}
        </button>
      )}
    </div>
  );
}
