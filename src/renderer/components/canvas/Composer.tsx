import { useState } from "react";
import { Button, Input } from "antd";
import {
  PlusOutlined,
  SettingOutlined,
  ArrowUpOutlined,
} from "@ant-design/icons";

interface ComposerStatusChip {
  label: string;
  active?: boolean;
}

interface ComposerProps {
  placeholder?: string;
  statusChips?: ComposerStatusChip[];   // 如 "已接受 2 · 待评审 3"
  onSubmit?: (value: string) => void;
  disabled?: boolean;
  submitLabel?: string;                 // "提交" / "继续分析"
}

export function Composer({
  placeholder = "描述需求，或补充说明…",
  statusChips = [],
  onSubmit,
  disabled = false,
  submitLabel,
}: ComposerProps) {
  const [value, setValue] = useState("");

  const handleSubmit = () => {
    if (!value.trim() || disabled) return;
    onSubmit?.(value.trim());
    setValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="wh-composer" data-testid="composer">
      {/* 状态 chips */}
      {statusChips.length > 0 && (
        <div className="wh-composer-status">
          {statusChips.map((chip, i) => (
            <span
              key={i}
              className={`wh-composer-status-chip ${chip.active ? "wh-composer-status-chip--active" : ""}`}
            >
              {chip.label}
            </span>
          ))}
        </div>
      )}

      {/* 输入框 + 工具栏 */}
      <div className="wh-composer-textarea-wrap">
        <Input.TextArea
          data-testid="composer-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoSize={{ minRows: 2, maxRows: 8 }}
        />

        <div className="wh-composer-toolbar">
          <div className="wh-composer-toolbar-left">
            <button className="wh-composer-chip-btn" aria-label="添加附件">
              <PlusOutlined style={{ fontSize: 11 }} />
            </button>
            <button className="wh-composer-chip-btn" aria-label="自动审查">
              <SettingOutlined style={{ fontSize: 11 }} />
              自动审查
            </button>
            <button className="wh-composer-chip-btn" aria-label="选择模型">
              5.5 中
            </button>
          </div>
          <div className="wh-composer-toolbar-right">
            <Button
              data-testid="composer-submit"
              type="primary"
              icon={<ArrowUpOutlined />}
              className="wh-composer-submit"
              disabled={!value.trim() || disabled}
              onClick={handleSubmit}
              aria-label={submitLabel || "提交"}
              title={submitLabel || "提交 (⌘↵)"}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
