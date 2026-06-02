import { Button, Typography, Divider, Empty, Badge, Tag, Space, List } from "antd";
import { PlusOutlined, FileTextOutlined, QuestionCircleOutlined, ClockCircleOutlined, FileOutlined, CodeOutlined, ApiOutlined } from "@ant-design/icons";
import { Conversations, FileCard } from "@ant-design/x";

const { Text } = Typography;

interface ContextReference {
  name: string;
  type: "document" | "code" | "api";
  path?: string;
}

interface SessionItem {
  key: string;
  label: React.ReactNode;
}

interface LeftContextPanelProps {
  sessions?: SessionItem[];
  contexts?: ContextReference[];
  agentStatus?: "idle" | "running" | "completed" | "failed";
  onNewSession?: () => void;
  onSessionClick?: (key: string) => void;
  onContextClick?: (name: string) => void;
}

const contextIconMap: Record<string, React.ReactNode> = {
  document: <FileTextOutlined style={{ color: "#1677ff" }} />,
  code: <CodeOutlined style={{ color: "#52c41a" }} />,
  api: <ApiOutlined style={{ color: "#faad14" }} />,
};

// Mock conversation data
const MOCK_CONVERSATIONS: SessionItem[] = [
  {
    key: "session-1",
    label: (
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <Text style={{ fontSize: 13 }}>共同购买推荐资源逻辑</Text>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
          <Tag color="processing" style={{ fontSize: 10, lineHeight: "16px", padding: "0 4px" }}>评审中</Tag>
          <Text type="secondary" style={{ fontSize: 11 }}>18 条候选用例</Text>
        </div>
      </div>
    ),
  },
  {
    key: "session-2",
    label: (
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <Text style={{ fontSize: 13 }}>办签材料自动分类</Text>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
          <Tag color="warning" style={{ fontSize: 10, lineHeight: "16px", padding: "0 4px" }}>待补资料</Tag>
          <Text type="secondary" style={{ fontSize: 11 }}>缺少接口样例</Text>
        </div>
      </div>
    ),
  },
];

export function LeftContextPanel({
  sessions = MOCK_CONVERSATIONS,
  contexts = [],
  agentStatus = "idle",
  onNewSession,
  onSessionClick,
  onContextClick,
}: LeftContextPanelProps) {
  const handleConversationClick = (key: string) => {
    onSessionClick?.(key);
  };

  const statusColor = agentStatus === "running" ? "processing" : agentStatus === "failed" ? "error" : "success";
  const statusText = agentStatus === "running" ? "分析中" : agentStatus === "failed" ? "异常" : "就绪";

  return (
    <div className="left-panel">
      <div className="left-panel-header">
        <Button type="primary" icon={<PlusOutlined />} block onClick={onNewSession}>
          新建测试任务
        </Button>
      </div>

      <div className="left-panel-body">
        <Divider style={{ margin: "16px 0 12px", fontSize: 12 }}>
          会话
        </Divider>

        {sessions.length > 0 ? (
          <Conversations
            items={sessions}
            onActiveChange={handleConversationClick}
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
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Badge status={statusColor as "success" | "processing" | "error" | "default" | "warning"} />
          <Text type="secondary" style={{ fontSize: 11 }}>
            Agent {statusText}
          </Text>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
          <ClockCircleOutlined style={{ fontSize: 11, color: "#8c8c8c" }} />
          <Text type="secondary" style={{ fontSize: 11 }}>
            DeepSeek API 已连接
          </Text>
        </div>
      </div>
    </div>
  );
}
