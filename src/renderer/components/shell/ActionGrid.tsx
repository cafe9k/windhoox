import {
  FileTextOutlined,
  MessageOutlined,
  GlobalOutlined,
  CodeOutlined,
  ConsoleSqlOutlined,
} from "@ant-design/icons";

interface ActionItem {
  key: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
  kbd?: string;
  onClick?: () => void;
}

const ACTIONS: ActionItem[] = [
  {
    key:   "file",
    icon:  <FileTextOutlined />,
    title: "文件",
    desc:  "浏览项目文件",
    kbd:   "⌘P",
  },
  {
    key:   "chat",
    icon:  <MessageOutlined />,
    title: "侧边聊天",
    desc:  "发起侧边对话",
  },
  {
    key:   "browser",
    icon:  <GlobalOutlined />,
    title: "浏览器",
    desc:  "打开网站",
    kbd:   "⌘T",
  },
  {
    key:   "review",
    icon:  <CodeOutlined />,
    title: "审查",
    desc:  "查看代码更改",
    kbd:   "⌃⇧G",
  },
  {
    key:   "terminal",
    icon:  <ConsoleSqlOutlined />,
    title: "终端",
    desc:  "启动交互式 shell",
    kbd:   "⌃`",
  },
];

interface ActionGridProps {
  onAction?: (key: string) => void;
}

export function ActionGrid({ onAction }: ActionGridProps) {
  return (
    <aside className="wh-action-grid" data-testid="action-grid">
      {ACTIONS.map((item, idx) => (
        <div key={item.key}>
          <div
            className="wh-action-card"
            role="button"
            tabIndex={0}
            aria-label={item.title}
            onClick={() => onAction?.(item.key)}
          >
            <div className="wh-action-card-icon">{item.icon}</div>
            <div className="wh-action-card-title">{item.title}</div>
            <div className="wh-action-card-desc">{item.desc}</div>
            {item.kbd && (
              <span className="wh-action-card-kbd">{item.kbd}</span>
            )}
          </div>
          {idx < ACTIONS.length - 1 && <div className="wh-action-divider" />}
        </div>
      ))}
    </aside>
  );
}
