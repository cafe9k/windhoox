import React, { useState, useEffect } from "react";
import type { AppConfig } from "../../types/agent";
import "./SettingsPanel.css";

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
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("https://api.deepseek.com");
  const [model, setModel] = useState("deepseek-reasoner");
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [apiKeySource, setApiKeySource] = useState<ConfigSource | null>(null);
  const agentApi = (window as any).windhoox?.agent;

  const isEnvKey = apiKeySource?.key === "env";

  useEffect(() => {
    if (agentApi?.getConfig) {
      agentApi.getConfig().then((config: ConfigWithSources) => {
        setApiKey(config.deepseekApiKey || "");
        setBaseUrl(config.deepseekBaseUrl || "https://api.deepseek.com");
        setModel(config.deepseekModel || "deepseek-reasoner");
        setApiKeySource(config._sources?.deepseekApiKey || null);
      }).catch(() => {
        // Silently fail — will use defaults
      });
    }
  }, [agentApi]);

  const handleSave = async () => {
    if (!agentApi?.setConfig) {
      setMessage("设置 API 不可用");
      return;
    }

    // If API key is from env, don't save it (it's read-only)
    const updates: Partial<AppConfig> = {
      deepseekBaseUrl: baseUrl,
      deepseekModel: model,
    };
    if (!isEnvKey) {
      updates.deepseekApiKey = apiKey;
    }

    setSaving(true);
    setMessage("");

    try {
      await agentApi.setConfig(updates);
      setMessage("✅ 设置已保存");
      setTimeout(() => setMessage(""), 2000);
    } catch (error) {
      setMessage(`❌ 保存失败: ${error instanceof Error ? error.message : "未知错误"}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h3>⚙️ 设置</h3>
          <button className="settings-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="settings-content">
          <div className="settings-section">
            <h4>DeepSeek API 配置</h4>

            <div className="settings-field">
              <div className="settings-label-row">
                <label htmlFor="api-key">API Key</label>
                {apiKeySource && (
                  <span className={`settings-source source-${apiKeySource.key}`}>
                    {apiKeySource.label}
                  </span>
                )}
              </div>
              <div className="settings-input-row">
                <input
                  id="api-key"
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => {
                    if (!isEnvKey) setApiKey(e.target.value);
                  }}
                  placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxx"
                  className={`settings-input ${isEnvKey ? "input-readonly" : ""}`}
                  readOnly={isEnvKey}
                />
                <button
                  type="button"
                  className="settings-toggle-key"
                  onClick={() => setShowKey(!showKey)}
                  title={showKey ? "隐藏" : "显示"}
                >
                  {showKey ? "🙈" : "👁️"}
                </button>
              </div>
              {isEnvKey ? (
                <p className="settings-hint hint-env">
                  API Key 来自 <code>.env.local</code> 环境变量，不可在 UI 中修改。
                  如需修改，请编辑项目根目录下的 <code>.env.local</code> 文件后重启应用。
                </p>
              ) : (
                <p className="settings-hint">
                  从 <a href="https://platform.deepseek.com/api_keys" target="_blank" rel="noopener">
                    DeepSeek 控制台
                  </a> 获取 API Key。
                </p>
              )}
            </div>

            <div className="settings-field">
              <label htmlFor="base-url">Base URL</label>
              <input
                id="base-url"
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://api.deepseek.com"
                className="settings-input"
              />
            </div>

            <div className="settings-field">
              <label htmlFor="model">模型</label>
              <select
                id="model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="settings-select"
              >
                <option value="deepseek-reasoner">
                  deepseek-reasoner（推理能力强，适合复杂分析）
                </option>
                <option value="deepseek-chat">
                  deepseek-chat（速度快，成本低）
                </option>
              </select>
            </div>
          </div>

          {message && (
            <div className={`settings-message ${message.startsWith("✅") ? "success" : "error"}`}>
              {message}
            </div>
          )}

          <div className="settings-actions">
            <button
              className="settings-save"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "保存中..." : "保存设置"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
