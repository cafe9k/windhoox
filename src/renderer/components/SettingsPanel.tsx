import { useState, useEffect } from "react";
import {
  Modal,
  Form,
  Input,
  Select,
  Button,
  Alert,
  Tag,
  Space,
  Typography,
} from "antd";
import { EyeOutlined, EyeInvisibleOutlined, SaveOutlined } from "@ant-design/icons";
import type { AppConfig } from "../../types/agent";

interface ConfigSource {
  key: string;
  label: string;
}

interface ConfigWithSources extends AppConfig {
  _sources: Record<string, ConfigSource>;
}

interface SettingsPanelProps {
  onClose: () => void;
}

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const [form] = Form.useForm();
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [apiKeySource, setApiKeySource] = useState<ConfigSource | null>(null);
  const agentApi = (window as any).windhoox?.agent;

  const isEnvKey = apiKeySource?.key === "env";

  useEffect(() => {
    if (agentApi?.getConfig) {
      agentApi.getConfig().then((config: ConfigWithSources) => {
        form.setFieldsValue({
          apiKey: config.deepseekApiKey || "",
          baseUrl: config.deepseekBaseUrl || "https://api.deepseek.com",
          model: config.deepseekModel || "deepseek-reasoner",
        });
        setApiKey(config.deepseekApiKey || "");
        setApiKeySource(config._sources?.deepseekApiKey || null);
      }).catch(() => {
        // Silently fail — will use defaults
      });
    }
  }, [agentApi, form]);

  const handleSave = async () => {
    if (!agentApi?.setConfig) {
      setMessage("设置 API 不可用");
      return;
    }

    const values = form.getFieldsValue();

    const updates: Partial<AppConfig> = {
      deepseekBaseUrl: values.baseUrl,
      deepseekModel: values.model,
    };
    if (!isEnvKey) {
      updates.deepseekApiKey = values.apiKey;
    }

    setSaving(true);
    setMessage("");

    try {
      await agentApi.setConfig(updates);
      setMessage("success");
      setTimeout(() => setMessage(""), 2000);
    } catch (error) {
      setMessage("error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      title={
        <Space>
          <span>设置</span>
        </Space>
      }
      onCancel={onClose}
      footer={null}
      width={520}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          baseUrl: "https://api.deepseek.com",
          model: "deepseek-reasoner",
        }}
      >
        <Typography.Title level={5} style={{ marginTop: 0 }}>
          DeepSeek API 配置
        </Typography.Title>

        <Form.Item
          label={
            <Space>
              <span>API Key</span>
              {apiKeySource && (
                <Tag color={apiKeySource.key === "env" ? "blue" : apiKeySource.key === "disk" ? "green" : "default"}>
                  {apiKeySource.label}
                </Tag>
              )}
            </Space>
          }
        >
          <Input.Password
            name="apiKey"
            placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxx"
            value={apiKey}
            onChange={(e) => {
              if (!isEnvKey) {
                setApiKey(e.target.value);
                form.setFieldValue("apiKey", e.target.value);
              }
            }}
            disabled={isEnvKey}
            readOnly={isEnvKey}
            visibilityToggle={{ visible: showKey, onVisibleChange: setShowKey }}
            iconRender={(visible) => (visible ? <EyeOutlined /> : <EyeInvisibleOutlined />)}
          />
        </Form.Item>

        {isEnvKey ? (
          <Alert
            type="info"
            showIcon
            message="API Key 来自环境变量"
            description={
              <>
                API Key 来自 <code>.env.local</code> 环境变量，不可在 UI 中修改。
                如需修改，请编辑项目根目录下的 <code>.env.local</code> 文件后重启应用。
              </>
            }
            style={{ marginBottom: 16 }}
          />
        ) : (
          <Typography.Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 16 }}>
            从{" "}
            <a href="https://platform.deepseek.com/api_keys" target="_blank" rel="noopener">
              DeepSeek 控制台
            </a>{" "}
            获取 API Key。
          </Typography.Text>
        )}

        <Form.Item label="Base URL" name="baseUrl">
          <Input placeholder="https://api.deepseek.com" />
        </Form.Item>

        <Form.Item label="模型" name="model">
          <Select>
            <Select.Option value="deepseek-reasoner">
              deepseek-reasoner（推理能力强，适合复杂分析）
            </Select.Option>
            <Select.Option value="deepseek-chat">
              deepseek-chat（速度快，成本低）
            </Select.Option>
          </Select>
        </Form.Item>

        {message === "success" && (
          <Alert type="success" message="设置已保存" style={{ marginBottom: 16 }} />
        )}
        {message === "error" && (
          <Alert type="error" message="保存失败" style={{ marginBottom: 16 }} />
        )}
        {message && message !== "success" && message !== "error" && (
          <Alert type="error" message={message} style={{ marginBottom: 16 }} />
        )}

        <Form.Item style={{ marginBottom: 0, textAlign: "right" }}>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSave}
            loading={saving}
          >
            {saving ? "保存中..." : "保存设置"}
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
}
