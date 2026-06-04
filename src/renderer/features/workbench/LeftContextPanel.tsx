import { Button, Typography, Divider, Empty, Tag, Space, List } from "antd";
import { PlusOutlined, FileTextOutlined, QuestionCircleOutlined, FileOutlined, CodeOutlined, ApiOutlined, SettingOutlined, LinkOutlined } from "@ant-design/icons";
import { Conversations } from "@ant-design/x";
import type { SessionSummary } from "../../../types/agent.js";

const { Text } = Typography;

interface ContextReference {
  name: string;
  type: "document" | "code" | "api";
  path?: string;
}

interface LeftContextPanelProps {
  sessions?: SessionSummary[];
  contexts?: ContextReference[];
  onNewSession?: () => void;
  onSessionClick?: (key: string) => void;
  onContextClick?: (name: string) => void;
  onOpenConfig?: () => void;
}

const contextIconMap: Record<string, React.ReactNode> = {
  document: <FileTextOutlined style={{ color: "#1677ff" }} />,
  code: <CodeOutlined style={{ color: "#52c41a" }} />,
  api: <ApiOutlined style={{ color: "#faad14" }} />,
};

const statusColorMap: Record<string, string> = {
  running: "processing",
  completed: "success",
  failed: "error",
};

const statusLabelMap: Record<string, string> = {
  running: "分析中",
  completed: "已完成",
  failed: "失败",
};

function truncate(text: string, maxLen = 20): string {
  return text.length > maxLen ? text.slice(0, maxLen) + "..." : text;
}

function buildSessionItems(sessions: SessionSummary[]): { key: string; label: React.ReactNode }[] {
  // Build a map of previousSessionId -> children
  const childrenMap = new Map<string, SessionSummary[]>();
  const rootSessions: SessionSummary[] = [];

  for (const s of sessions) {
    if (s.previousSessionId) {
      const siblings = childrenMap.get(s.previousSessionId) || [];
      siblings.push(s);
      childrenMap.set(s.previousSessionId, siblings);
    } else {
      rootSessions.push(s);
    }
  }

  const items: { key: string; label: React.ReactNode }[] = [];

  function renderSession(s: SessionSummary, depth: number) {
    const color = statusColorMap[s.status] || "default";
    const label = statusLabelMap[s.status] || s.status;
    const dateStr = new Date(s.createdAt).toLocaleDateString("zh-CN", { month: "short", day: "numeric" });

    items.push({
      key: s.id,
      label: (
        <div style={{ display: "flex", flexDirection: "column", gap: 2, paddingLeft: depth * 12 }}>
          <Text style={{ fontSize: 13 }}>
            {truncate(s.requirementText, 18)}
          </Text>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
            <Tag color={color} style={{ fontSize: 10, lineHeight: "16px", padding: "0 4px" }}>{label}</Tag>
            {depth > 0 && (
              <Tag icon={<LinkOutlined />} style={{ fontSize: 10, lineHeight: "16px", padding: "0 4px" }}>
                续
              </Tag>
            )}
            <Text type="secondary" style={{ fontSize: 11 }}>{dateStr}</Text>
          </div>
        </div>
      ),
    });

    // Recursively add children
    const children = childrenMap.get(s.id);
    if (children) {
      for (const child of children) {
        renderSession(child, depth + 1);
      }
    }
  }

  for (const s of rootSessions) {
    renderSession(s, 0);
  }

  return items;
}

export function LeftContextPanel({
  sessions = [],
  contexts = [],
  onNewSession,
  onSessionClick,
  onContextClick,
  onOpenConfig,
}: LeftContextPanelProps) {
  const conversationItems = buildSessionItems(sessions);

  return (
    <div className="left-panel">
      <div className="left-panel-header">
        <Button type="primary" icon={<PlusOutlined />} block onClick={onNewSession}>
          新建测试任务
        </Button>
      </div>

      <div className="left-panel-body">
        <Divider style={{ margin: "16px 0 12px", fontSize: 12 }}>
          会话 ({sessions.length})
        </Divider>

        {conversationItems.length > 0 ? (
          <Conversations
            items={conversationItems}
            onActiveChange={(key) => onSessionClick?.(key)}
            styles={{
              item: {
                padding: "8px 12px",
                marginBottom: 4,
              },
            }}
          />
        ) : (
          <Empty
            image={<FileTextOutlined style={{ fontSize: 32, color: "#d9d9d9" }} />}
            imageStyle={{ height: 32 }}
            description={<Text type="secondary" style={{ fontSize: 12 }}>暂无会话</Text>}
          />
        )}

        <Divider style={{ margin: "16px 0 12px", fontSize: 12 }}>
          上下文资料
        </Divider>

        {contexts.length > 0 ? (
          <List
            size="small"
            dataSource={contexts}
            renderItem={(item) => (
              <List.Item
                style={{ padding: "8px 0", cursor: "pointer" }}
                onClick={() => onContextClick?.(item.name)}
              >
                <Space>
                  {contextIconMap[item.type] || <FileOutlined />}
                  <Text style={{ fontSize: 12 }}>{item.name}</Text>
                </Space>
              </List.Item>
            )}
          />
        ) : (
          <Empty
            image={<QuestionCircleOutlined style={{ fontSize: 32, color: "#d9d9d9" }} />}
            imageStyle={{ height: 32 }}
            description={<Text type="secondary" style={{ fontSize: 12 }}>暂无资料</Text>}
          />
        )}
      </div>

      <div className="left-panel-footer">
        <Button
          type="text"
          block
          icon={<SettingOutlined />}
          onClick={onOpenConfig}
        >
          AI 配置
        </Button>
      </div>
    </div>
  );
}
