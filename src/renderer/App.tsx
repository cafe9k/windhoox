import { ConfigProvider, theme, App as AntdApp } from "antd";
import { Workbench } from "./components/Workbench";
import "./styles/tokens.css";
import "./styles/reset.css";
import "./styles/antd-overrides.css";
import "./styles/layout.css";
import "./styles/messages.css";
import "./styles/composer.css";

export function App() {
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary:          "#1677ff",
          colorSuccess:          "#52c41a",
          colorWarning:          "#faad14",
          colorError:            "#ff4d4f",
          colorInfo:             "#1677ff",
          colorTextBase:         "#1a1a1a",
          colorBgBase:           "#ffffff",
          colorBorder:           "#e8e8e8",
          colorBorderSecondary:  "#e8e8e8",
          borderRadius:          6,
          borderRadiusSM:        4,
          borderRadiusLG:        8,
          fontSize:              13,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif',
          fontSizeSM:            11,
          fontSizeLG:            14,
          controlHeight:         32,
          controlHeightSM:       26,
          controlHeightLG:       38,
          lineHeight:            1.5,
          boxShadow:             "none",
          boxShadowSecondary:    "0 4px 12px rgba(0,0,0,0.08)",
        },
        components: {
          Card:      { headerBg: "transparent", headerFontSize: 13, headerHeight: 44 },
          Button:    { defaultShadow: "none", primaryShadow: "none" },
          Input:     { activeShadow: "0 0 0 2px rgba(22,119,255,0.15)" },
          Tag:       { defaultBg: "#fafafa", defaultColor: "#595959" },
          Statistic: { contentFontSize: 18 },
          Modal:     { titleFontSize: 14, titleLineHeight: 1.4 },
          Layout:    {
            headerBg: "#ffffff",
            siderBg:  "#f5f5f5",
            triggerBg:"#e8e8e8",
            triggerColor: "#595959",
          },
        },
      }}
    >
      <AntdApp>
        <Workbench />
      </AntdApp>
    </ConfigProvider>
  );
}
