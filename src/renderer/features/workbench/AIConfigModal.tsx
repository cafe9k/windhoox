import { useState, useEffect } from "react";
import { Modal, Form, Input, Button, Space, message, Typography } from "antd";
import { KeyOutlined, ApiOutlined, EyeOutlined, EyeInvisibleOutlined } from "@ant-design/icons";

const { Text } = Typography;

interface AIConfig {
  deepseekApiKey: string;
  deepseekBaseUrl: string;
  deepseekModel: string;
}

interface AIConfigModalProps {
  open: boolean;
  onClose: () => void;
}

export function AIConfigModal({ open, onClose }: AIConfigModalProps) {
  const [form] = Form.useForm<AIConfig>();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showKey, setShowKey] = useState(false);

  const agentApi = (window as any).windhoox?.agent;

  // Load config when modal opens
  useEffect(() => {
    if (open && agentApi?.getConfig) {
      setLoading(true);
      agentApi.getConfig()
        .then((config: AIConfig) => {
          form.setFieldsValue({
            deepseekApiKey: config.deepseekApiKey || "",
            deepseekBaseUrl: config.deepseekBaseUrl || "https://api.deepseek.com",
            deepseekModel: config.deepseekModel || "deepseek-chat",
          });
        })
        .catch(() => {
          message.error("读取配置失败");
        })
        .finally(() => setLoading(false));
    }
  }, [open, agentApi, form]);

  const handleSave = async () => {
    if (!agentApi?.setConfig) {
      message.error("Agent API 不可用");
      return;
    }

    try {
      const values = await form.validateFields();
      setSaving(true);
      await agentApi.setConfig({
        deepseekApiKey: values.deepseekApiKey,
        deepseekBaseUrl: values.deepseekBaseUrl,
        deepseekModel: values.deepseekModel,
      });
      message.success("配置已保存");
      onClose();
    } catch (err) {
      if (err instanceof Error) {
        message.error(err.message);
      } else {
        message.error("保存配置失败");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={
        <Space>
          <KeyOutlined />
          <span>AI 模型配置</span>
        </Space>
      }
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose}>
          取消
        </Button>,
        <Button key="save" type="primary" loading={saving} onClick={handleSave}>
          保存
        </Button>,
      ]}
      destroyOnHidden
      width={520}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          deepseekBaseUrl: "https://api.deepseek.com",
          deepseekModel: "deepseek-chat",
        }}
        style={{ marginTop: 16 }}
      >
        <Form.Item
          name="deepseekApiKey"
          label="API Key"
          rules={[{ required: true, message: "请输入 DeepSeek API Key" }]}
          extra="从 platform.deepseek.com 获取"
        >
          <Input
            prefix={<KeyOutlined />}
            placeholder="sk-..."
            type={showKey ? "text" : "password"}
            suffix={
              <Button
                type="text"
                size="small"
                icon={showKey ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                onClick={() => setShowKey(!showKey)}
              />
            }
          />
        </Form.Item>

        <Form.Item
          name="deepseekBaseUrl"
          label="Base URL"
          rules={[{ required: true, message: "请输入 Base URL" }]}
        >
          <Input
            prefix={<ApiOutlined />}
            placeholder="https://api.deepseek.com"
          />
        </Form.Item>

        <Form.Item
          name="deepseekModel"
          label="模型名称"
          rules={[{ required: true, message: "请输入模型名称" }]}
        >
          <Input placeholder="deepseek-chat" />
        </Form.Item>
      </Form>

      <div style={{ padding: "8px 12px", background: "#f6f8fa", borderRadius: 6, fontSize: 12 }}>
        <Text type="secondary">
          💡 提示：配置会保存到本地，仅在当前设备生效。API Key 不会上传到任何服务器。
        </Text>
      </div>
    </Modal>
  );
}
