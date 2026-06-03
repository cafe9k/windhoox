import { useState, useEffect } from "react";
import { Modal, Form, Input, Button, Space, message, Typography, InputNumber, Slider } from "antd";
import { KeyOutlined, EyeOutlined, EyeInvisibleOutlined, SettingOutlined } from "@ant-design/icons";

const { Text } = Typography;
const { TextArea } = Input;

interface AIConfig {
  anthropicApiKey: string;
  baseURL: string;
  model: string;
  systemPrompt: string;
  maxTokens: number;
  temperature: number;
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

  useEffect(() => {
    if (open && agentApi?.getConfig) {
      setLoading(true);
      agentApi.getConfig()
        .then((config: AIConfig) => {
          form.setFieldsValue({
            anthropicApiKey: config.anthropicApiKey || "",
            baseURL: config.baseURL || "",
            model: config.model || "claude-sonnet-4-5",
            systemPrompt: config.systemPrompt || "",
            maxTokens: config.maxTokens || 8000,
            temperature: config.temperature || 0.3,
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
        anthropicApiKey: values.anthropicApiKey,
        baseURL: values.baseURL,
        model: values.model,
        systemPrompt: values.systemPrompt,
        maxTokens: values.maxTokens,
        temperature: values.temperature,
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
          <SettingOutlined />
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
      width={640}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          model: "claude-sonnet-4-5",
          maxTokens: 8000,
          temperature: 0.3,
        }}
        style={{ marginTop: 16 }}
      >
        <Form.Item
          name="anthropicApiKey"
          label="API Key"
          rules={[{ required: true, message: "请输入 API Key" }]}
          extra="Anthropic API Key 或兼容服务的 Key（如 DeepSeek）"
        >
          <Input
            prefix={<KeyOutlined />}
            placeholder="sk-ant-... 或 DeepSeek sk-..."
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
          name="baseURL"
          label="API Base URL（可选）"
          extra="留空使用 Anthropic 官方地址。DeepSeek 兼容模式填写：https://api.deepseek.com/anthropic"
        >
          <Input placeholder="https://api.deepseek.com/anthropic" />
        </Form.Item>

        <Form.Item
          name="model"
          label="模型"
          rules={[{ required: true, message: "请输入模型名称" }]}
        >
          <Input placeholder="claude-sonnet-4-5" />
        </Form.Item>

        <Form.Item
          name="systemPrompt"
          label="系统提示词"
          extra="用于指导 AI 生成测试用例的提示词"
        >
          <TextArea
            rows={6}
            placeholder="You are a senior QA engineer..."
          />
        </Form.Item>

        <Form.Item
          name="maxTokens"
          label="最大 Token 数"
        >
          <InputNumber
            min={1000}
            max={32000}
            step={1000}
            style={{ width: "100%" }}
          />
        </Form.Item>

        <Form.Item
          name="temperature"
          label="Temperature"
          extra="控制输出的随机性，0 为确定性，1 为创造性"
        >
          <Slider
            min={0}
            max={1}
            step={0.1}
            marks={{
              0: "确定性",
              0.5: "平衡",
              1: "创造性",
            }}
          />
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
