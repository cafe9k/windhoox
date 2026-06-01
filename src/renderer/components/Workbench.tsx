import React, { useState, useCallback, useEffect } from "react";
import { TaskInput } from "./TaskInput";
import "./Workbench.css";

type SessionState = "idle" | "running" | "completed" | "failed";

interface Session {
  id: string;
  state: SessionState;
  requirement?: string;
}

export function Workbench() {
  const [session, setSession] = useState<Session | null>(null);
  const agentApi = (window as any).windhoox?.agent;

  const handleStartAnalysis = useCallback(
    async (requirement: string) => {
      if (!agentApi) {
        console.error("Agent API not available");
        return;
      }

      setSession({
        id: `session-${Date.now()}`,
        state: "running",
        requirement
      });

      try {
        const result = await agentApi.startAnalysis({
          requirementText: requirement
        });

        setSession((prev) =>
          prev
            ? {
                ...prev,
                id: result.sessionId,
                state: "running"
              }
            : null
        );
      } catch (error) {
        console.error("Failed to start analysis:", error);
        setSession((prev) =>
          prev
            ? {
                ...prev,
                state: "failed"
              }
            : null
        );
      }
    },
    [agentApi]
  );

  return (
    <div className="workbench">
      <aside className="workbench-panel left-panel">
        <div className="panel-header">Task & Context</div>
        <div className="panel-content">
          {!session ? (
            <TaskInput onSubmit={handleStartAnalysis} />
          ) : (
            <div className="session-info">
              <div className="session-state" data-state={session.state}>
                {session.state === "running" && "Analyzing..."}
                {session.state === "completed" && "Analysis Complete"}
                {session.state === "failed" && "Analysis Failed"}
                {session.state === "idle" && "Ready"}
              </div>
              {session.requirement && (
                <div className="session-requirement">
                  <strong>Requirement:</strong>
                  <p>{session.requirement}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>

      <main className="workbench-panel center-panel">
        <div className="panel-header">Agent Analysis</div>
        <div className="panel-content empty-state">
          {!session ? (
            <p>Create a task to begin analysis</p>
          ) : session.state === "running" ? (
            <p>Analysis in progress...</p>
          ) : (
            <p>Analysis results will appear here</p>
          )}
        </div>
      </main>

      <aside className="workbench-panel right-panel">
        <div className="panel-header">Test Asset Pool</div>
        <div className="panel-content empty-state">
          <p>No test cases generated</p>
        </div>
      </aside>
    </div>
  );
}
