import React from "react";
import "./Workbench.css";

export function Workbench() {
  return (
    <div className="workbench">
      <aside className="workbench-panel left-panel">
        <div className="panel-header">Task & Context</div>
        <div className="panel-content empty-state">
          <p>No active task</p>
        </div>
      </aside>

      <main className="workbench-panel center-panel">
        <div className="panel-header">Agent Analysis</div>
        <div className="panel-content empty-state">
          <p>Create a task to begin analysis</p>
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
