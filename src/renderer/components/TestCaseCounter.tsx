import { Row, Col, Statistic } from "antd";
import {
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  QuestionCircleOutlined,
} from "@ant-design/icons";

interface TestCaseCounterProps {
  counts: {
    pending: number;
    accepted: number;
    rejected: number;
    needsClarification: number;
  };
}

export function TestCaseCounter({ counts }: TestCaseCounterProps) {
  return (
    <Row gutter={8} style={{ marginBottom: 16 }}>
      <Col span={6}>
        <Statistic
          data-testid="counter-pending"
          title="待审核"
          value={counts.pending}
          styles={{ content: { color: "#faad14", fontSize: 18 } }}
          prefix={<ClockCircleOutlined />}
        />
      </Col>
      <Col span={6}>
        <Statistic
          data-testid="counter-accepted"
          title="已接受"
          value={counts.accepted}
          styles={{ content: { color: "#52c41a", fontSize: 18 } }}
          prefix={<CheckCircleOutlined />}
        />
      </Col>
      <Col span={6}>
        <Statistic
          data-testid="counter-rejected"
          title="已拒绝"
          value={counts.rejected}
          styles={{ content: { color: "#ff4d4f", fontSize: 18 } }}
          prefix={<CloseCircleOutlined />}
        />
      </Col>
      <Col span={6}>
        <Statistic
          data-testid="counter-clarification"
          title="需要澄清"
          value={counts.needsClarification}
          styles={{ content: { color: "#1890ff", fontSize: 18 } }}
          prefix={<QuestionCircleOutlined />}
        />
      </Col>
    </Row>
  );
}
