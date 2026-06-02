import { RobotOutlined } from "@ant-design/icons";

interface SystemMessageProps {
  title: string;
  detail?: string;
}

export function SystemMessage({ title, detail }: SystemMessageProps) {
  return (
    <div className="wh-msg-system wh-animate-in" data-testid="system-message">
      <div className="wh-msg-system-icon">
        <RobotOutlined />
      </div>
      <div className="wh-msg-system-body">
        <div className="wh-msg-system-title">{title}</div>
        {detail && <div>{detail}</div>}
      </div>
    </div>
  );
}
