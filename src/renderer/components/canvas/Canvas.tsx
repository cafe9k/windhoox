import { ReactNode } from "react";

interface CanvasProps {
  title?: string;
  headerExtra?: ReactNode;   // 计数 chip、状态点等
  children: ReactNode;       // ConversationLog
  footer?: ReactNode;        // Composer
}

export function Canvas({ title = "新对话", headerExtra, children, footer }: CanvasProps) {
  return (
    <main className="wh-canvas" data-testid="canvas">
      {/* Header */}
      <div className="wh-canvas-header">
        <span className="wh-canvas-header-title">{title}</span>
        {headerExtra && (
          <div className="wh-canvas-header-meta">{headerExtra}</div>
        )}
      </div>

      {/* Body：滚动区 */}
      <div className="wh-canvas-body">
        {children}
      </div>

      {/* Footer：Composer */}
      {footer && (
        <div className="wh-canvas-footer">
          {footer}
        </div>
      )}
    </main>
  );
}
