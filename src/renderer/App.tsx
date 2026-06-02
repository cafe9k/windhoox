import { ConfigProvider, theme, App as AntdApp } from "antd";
import { Workbench } from "./components/Workbench";

export function App() {
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: "#0066b8",
          colorSuccess: "#2ea043",
          colorWarning: "#d4a72c",
          colorError: "#cf222e",
          colorInfo: "#0969da",
          colorTextBase: "#242424",
          colorBgBase: "#ffffff",
          colorBorder: "#e5e5e5",
          colorBorderSecondary: "#e5e5e5",
          borderRadius: 6,
          borderRadiusSM: 4,
          borderRadiusLG: 8,
          fontSize: 13,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif',
          fontSizeSM: 12,
          fontSizeLG: 14,
          controlHeight: 32,
          controlHeightSM: 26,
          controlHeightLG: 38,
          lineHeight: 1.5,
          paddingXS: 4,
          paddingSM: 8,
          padding: 12,
          paddingMD: 14,
          paddingLG: 18,
          marginXS: 4,
          marginSM: 6,
          margin: 10,
          marginMD: 14,
          marginLG: 18,
          boxShadow: "none",
          boxShadowSecondary: "0 2px 8px rgba(0, 0, 0, 0.06)",
        },
        components: {
          Card: {
            headerBg: "transparent",
            headerFontSize: 13,
            headerHeight: 44,
          },
          Button: {
            defaultShadow: "none",
            primaryShadow: "none",
          },
          Input: {
            activeShadow: "0 0 0 2px rgba(0, 102, 184, 0.15)",
          },
          Tag: {
            defaultBg: "#fafafa",
            defaultColor: "#616161",
          },
          Statistic: {
            contentFontSize: 18,
          },
          Modal: {
            titleFontSize: 15,
            titleLineHeight: 1.4,
          },
          Layout: {
            headerBg: "#ffffff",
            siderBg: "#f5f5f5",
            triggerBg: "#e5e5e5",
            triggerColor: "#616161",
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
