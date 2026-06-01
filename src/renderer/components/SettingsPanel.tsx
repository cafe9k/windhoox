import React, { useState, useEffect } from "react";
import type { AppConfig } from "../../types/agent";
import "./SettingsPanel.css";

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
  const agentApi = (window as any).windhoox?.agent;

  useEffect(() => {
    // Load current config
    if (agentApi?.getConfig) {
      agentApi.getConfig().then((config: AppConfig) => {
        setApiKey(config.deepseekApiKey || "");
        setBaseUrl(config.deepseekBaseUrl || "https://api.deepseek.com");
        setModel(config.deepseekModel || "deepseek-reasoner");
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

    setSaving(true);
    setMessage("");

    try {
      await agentApi.setConfig({
        deepseekApiKey: apiKey,
        deepseekBaseUrl: baseUrl,
        deepseekModel: model,
      });
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
              <label htmlFor="api-key">API Key</label>
              <div className="settings-input-row">
                <input
                  id="api-key"
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxx"
                  className="settings-input"
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
              <p className="settings-hint">
                从 <a href="https://platform.deepseek.com/api_keys" target="_blank" rel="noopener">
                  DeepSeek 控制台
                </a> 获取 API Key。开发环境下也可写入 .env.local 文件。
              </p>
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
