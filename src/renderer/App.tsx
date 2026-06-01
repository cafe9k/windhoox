import { ConfigProvider, theme, App as AntdApp } from "antd";
import { Workbench } from "./components/Workbench";

export function App() {
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: "#4f46e5",
          colorSuccess: "#10b981",
          colorWarning: "#f59e0b",
          colorError: "#ef4444",
          colorInfo: "#0ea5e9",
          colorTextBase: "#0f172a",
          colorBgBase: "#f8fafc",
          colorBorder: "#e2e8f0",
          colorBorderSecondary: "#f1f5f9",
          borderRadius: 10,
          borderRadiusSM: 6,
          borderRadiusLG: 14,
          fontSize: 13,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif',
          fontSizeSM: 12,
          fontSizeLG: 14,
          controlHeight: 34,
          controlHeightSM: 28,
          controlHeightLG: 40,
          lineHeight: 1.6,
          paddingXS: 6,
          paddingSM: 10,
          padding: 14,
          paddingMD: 16,
          paddingLG: 20,
          marginXS: 4,
          marginSM: 8,
          margin: 12,
          marginMD: 16,
          marginLG: 20,
          boxShadow:
            "0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 1px -0.5px rgb(15 23 42 / 0.02)",
          boxShadowSecondary:
            "0 10px 15px -3px rgb(15 23 42 / 0.06), 0 4px 6px -4px rgb(15 23 42 / 0.03)",
        },
        components: {
          Card: {
            headerBg: "transparent",
            headerFontSize: 13,
            headerHeight: 48,
          },
          Button: {
            defaultShadow: "none",
            primaryShadow: "0 1px 2px rgb(79 70 229 / 0.15)",
          },
          Input: {
            activeShadow: "0 0 0 3px rgb(79 70 229 / 0.08)",
          },
          Tag: {
            defaultBg: "#f1f5f9",
            defaultColor: "#475569",
          },
          Statistic: {
            contentFontSize: 20,
          },
          Modal: {
            titleFontSize: 15,
            titleLineHeight: 1.4,
          },
          Layout: {
            headerBg: "#ffffff",
            siderBg: "#ffffff",
            triggerBg: "#f1f5f9",
            triggerColor: "#475569",
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
