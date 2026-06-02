import {
  PlusOutlined,
  SearchOutlined,
  ThunderboltOutlined,
  AppstoreOutlined,
  RocketOutlined,
  MobileOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { Tooltip } from "antd";

interface SessionItem {
  id: string;
  title: string;
  meta?: string;   // 如 "1 小时" / "17 小时"
  active?: boolean;
}

interface LeftRailProps {
  sessions?: SessionItem[];
  onNewSession?: () => void;
  onSelectSession?: (id: string) => void;
  onOpenSettings?: () => void;
}

const PRIMARY_ACTIONS = [
  { icon: <PlusOutlined />,        label: "新对话",       key: "new" },
  { icon: <SearchOutlined />,      label: "搜索",         key: "search" },
  { icon: <ThunderboltOutlined />, label: "技能",         key: "skills" },
  { icon: <AppstoreOutlined />,    label: "插件",         key: "plugins" },
  { icon: <RocketOutlined />,      label: "自动化",       key: "automation" },
  { icon: <MobileOutlined />,      label: "Codex 移动版", key: "codex" },
];

export function LeftRail({
  sessions = [],
  onNewSession,
  onSelectSession,
  onOpenSettings,
}: LeftRailProps) {
  const pinnedSessions = sessions.filter((s) => s.active);
  const recentSessions = sessions.filter((s) => !s.active);

  return (
    <aside className="wh-rail" data-testid="left-rail">
      {/* 主操作区 */}
      <div className="wh-rail-primary-actions">
        {PRIMARY_ACTIONS.map((item) => (
          <div
            key={item.key}
            className="wh-rail-action-item"
            role="button"
            tabIndex={0}
            aria-label={item.label}
            onClick={item.key === "new" ? onNewSession : undefined}
          >
            {item.icon}
            <span>{item.label}</span>
          </div>
        ))}
      </div>

      {/* 会话列表 */}
      <div className="wh-rail-scroll">
        <div className="wh-rail-section-label">任务与上下文</div>

        {pinnedSessions.length > 0 && (
          <>
            <div className="wh-rail-section-label">置顶</div>
            {pinnedSessions.map((s) => (
              <div
                key={s.id}
                className="wh-rail-session-item wh-rail-session-item--active"
                role="button"
                tabIndex={0}
                aria-label={s.title}
                onClick={() => onSelectSession?.(s.id)}
              >
                <span className="wh-rail-session-title">{s.title}</span>
                {s.meta && <span className="wh-rail-session-meta">{s.meta}</span>}
              </div>
            ))}
          </>
        )}

        {recentSessions.length > 0 && (
          <>
            <div className="wh-rail-section-label">最近</div>
            {recentSessions.map((s) => (
              <div
                key={s.id}
                className="wh-rail-session-item"
                role="button"
                tabIndex={0}
                aria-label={s.title}
                onClick={() => onSelectSession?.(s.id)}
              >
                <span className="wh-rail-session-title">{s.title}</span>
                {s.meta && <span className="wh-rail-session-meta">{s.meta}</span>}
              </div>
            ))}
          </>
        )}

        {sessions.length === 0 && (
          <div style={{ padding: "16px 14px", fontSize: 12, color: "var(--text-muted)" }}>
            还没有分析记录
          </div>
        )}
      </div>

      {/* 底部设置 */}
      <div className="wh-rail-footer">
        <Tooltip title="设置" placement="right">
          <div
            className="wh-rail-action-item"
            role="button"
            tabIndex={0}
            aria-label="设置"
            onClick={onOpenSettings}
          >
            <SettingOutlined />
            <span>设置</span>
          </div>
        </Tooltip>
      </div>
    </aside>
  );
}
