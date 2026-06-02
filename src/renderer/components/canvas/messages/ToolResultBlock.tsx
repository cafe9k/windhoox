import { useState } from "react";
import { CaretRightOutlined, CaretDownOutlined } from "@ant-design/icons";

interface ToolResultBlockProps {
  label: string;
  output: string;
}

export function ToolResultBlock({ label, output }: ToolResultBlockProps) {
  const [expanded, setExpanded] = useState(false);
  const preview = output.split("\n")[0];

  return (
    <div className="wh-msg-tool-block" data-testid="tool-result-block">
      <div
        className="wh-msg-tool-header"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded
          ? <CaretDownOutlined  style={{ color: "var(--text-muted)", fontSize: 11 }} />
          : <CaretRightOutlined style={{ color: "var(--text-muted)", fontSize: 11 }} />
        }
        <span className="wh-msg-tool-label">{label}</span>
        {!expanded && (
          <span className="wh-msg-tool-preview">· {preview}</span>
        )}
      </div>
      {expanded && (
        <div className="wh-msg-tool-body" data-testid="tool-result-body">
          {output}
        </div>
      )}
    </div>
  );
}
