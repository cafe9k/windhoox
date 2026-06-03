import { Layout } from "antd";
import { LeftOutlined, RightOutlined } from "@ant-design/icons";

const { Sider, Content } = Layout;

interface WorkbenchLayoutProps {
  left: React.ReactNode;
  center: React.ReactNode;
  right: React.ReactNode;
  rightCollapsed: boolean;
  onRightCollapsedChange: (collapsed: boolean) => void;
}

export function WorkbenchLayout({ left, center, right, rightCollapsed, onRightCollapsedChange }: WorkbenchLayoutProps) {
  return (
    <div className="workbench-root">
      <div className="workbench-body">
        <Sider width={280} className="workbench-left">
          {left}
        </Sider>
        <Content className="workbench-center">{center}</Content>

        {/* 右侧面板折叠按钮 */}
        <div className="workbench-right-toggle">
          <button
            className="right-toggle-btn"
            onClick={() => onRightCollapsedChange(!rightCollapsed)}
            title={rightCollapsed ? "展开测试资产池" : "折叠测试资产池"}
          >
            {rightCollapsed ? <LeftOutlined /> : <RightOutlined />}
          </button>
        </div>

        {/* 右侧面板 */}
        {!rightCollapsed && (
          <Sider width={420} className="workbench-right">
            {right}
          </Sider>
        )}
      </div>
    </div>
  );
}
