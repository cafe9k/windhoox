import { ConfigProvider, theme, App as AntdApp } from "antd";
import { Workbench } from "./components/Workbench";

export function App() {
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: "#2563eb",
          borderRadius: 6,
          fontSize: 13,
        },
      }}
    >
      <AntdApp>
        <Workbench />
      </AntdApp>
    </ConfigProvider>
  );
}
