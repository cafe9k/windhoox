import { Layout } from "antd";

const { Sider, Content } = Layout;

interface WorkbenchLayoutProps {
  left: React.ReactNode;
  center: React.ReactNode;
  right: React.ReactNode;
  topBar?: React.ReactNode;
}

export function WorkbenchLayout({ left, center, right, topBar }: WorkbenchLayoutProps) {
  return (
    <div className="workbench-root">
      {topBar && <div className="workbench-topbar">{topBar}</div>}
      <div className="workbench-body">
        <Sider width={280} className="workbench-left">
          {left}
        </Sider>
        <Content className="workbench-center">{center}</Content>
        <Sider width={420} className="workbench-right">
          {right}
        </Sider>
      </div>
    </div>
  );
}
