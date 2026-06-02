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
      agentApi
        .getConfig()
        .then((config: ConfigWithSources) => {
          form.setFieldsValue({
            apiKey: config.deepseekApiKey || "",
            baseUrl: config.deepseekBaseUrl || "https://api.deepseek.com",
            model: config.deepseekModel || "deepseek-reasoner",
          });
          setApiKey(config.deepseekApiKey || "");
          setApiKeySource(config._sources?.deepseekApiKey || null);
        })
        .catch(() => {
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
        <span style={{ fontWeight: 600, fontSize: 15, color: "var(--text-primary)" }}>
          设置
        </span>
      }
      onCancel={onClose}
      footer={null}
      width={520}
      bodyStyle={{ padding: 24 }}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          baseUrl: "https://api.deepseek.com",
          model: "deepseek-reasoner",
        }}
      >
        <h3 className="wh-settings-section-title">DeepSeek API 配置</h3>

        <Form.Item
          label={
            <Space>
              <span style={{ color: "var(--text-secondary)" }}>API Key</span>
              {apiKeySource && (
                <Tag
                  color={
                    apiKeySource.key === "env"
                      ? "blue"
                      : apiKeySource.key === "disk"
                        ? "green"
                        : "default"
                  }
                  style={{ fontSize: 11 }}
                >
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
            iconRender={(visible) =>
              visible ? <EyeOutlined /> : <EyeInvisibleOutlined />
            }
            style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}
          />
        </Form.Item>

        {isEnvKey ? (
          <Alert
            type="info"
            showIcon
            message="API Key 来自环境变量"
            description={
              <>
                API Key 来自 <code style={{ fontFamily: "var(--font-mono)" }}>.env.local</code> 环境变量，不可在 UI 中修改。如需修改，请编辑项目根目录下的{" "}
                <code style={{ fontFamily: "var(--font-mono)" }}>.env.local</code> 文件后重启应用。
              </>
            }
            style={{ marginBottom: 16 }}
          />
        ) : (
          <div
            style={{
              fontSize: 12,
              color: "var(--text-muted)",
              marginBottom: 16,
            }}
          >
            从{" "}
            <a
              href="https://platform.deepseek.com/api_keys"
              target="_blank"
              rel="noopener"
              style={{ color: "var(--accent)" }}
            >
              DeepSeek 控制台
            </a>{" "}
            获取 API Key。
          </div>
        )}

        <Form.Item label={<span style={{ color: "var(--text-secondary)" }}>Base URL</span>} name="baseUrl">
          <Input placeholder="https://api.deepseek.com" style={{ fontFamily: "var(--font-mono)", fontSize: 13 }} />
        </Form.Item>

        <Form.Item label={<span style={{ color: "var(--text-secondary)" }}>模型</span>} name="model">
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
          <Alert
            type="success"
            message="设置已保存"
            style={{ marginBottom: 16 }}
          />
        )}
        {message === "error" && (
          <Alert
            type="error"
            message="保存失败"
            style={{ marginBottom: 16 }}
          />
        )}
        {message && message !== "success" && message !== "error" && (
          <Alert
            type="error"
            message={message}
            style={{ marginBottom: 16 }}
          />
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
