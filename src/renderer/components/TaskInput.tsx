import React, { useState } from "react";
import "./TaskInput.css";

interface TaskInputProps {
  onSubmit: (requirement: string) => void;
  isLoading?: boolean;
}

export function TaskInput({ onSubmit, isLoading = false }: TaskInputProps) {
  const [requirement, setRequirement] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (requirement.trim()) {
      onSubmit(requirement);
    }
  };

  const isButtonDisabled = !requirement.trim() || isLoading;

  return (
    <form className="task-input" onSubmit={handleSubmit}>
      <div className="input-group">
        <label htmlFor="requirement-input">需求描述</label>
        <textarea
          id="requirement-input"
          className="requirement-textarea"
          placeholder="描述需要测试的功能或需求..."
          value={requirement}
          onChange={(e) => setRequirement(e.target.value)}
          disabled={isLoading}
          rows={6}
        />
      </div>

      <div className="input-actions">
        <button
          type="submit"
          className="start-button"
          disabled={isButtonDisabled}
        >
          {isLoading ? "分析中..." : "开始分析"}
        </button>
      </div>
    </form>
  );
}
