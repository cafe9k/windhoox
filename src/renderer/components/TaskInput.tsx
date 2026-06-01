import { useState } from "react";
import { Form, Input, Button, Space } from "antd";
import { PlayCircleOutlined, ExperimentOutlined } from "@ant-design/icons";

const DEFAULT_REQUIREMENT = `用户在订单详情页点击"申请退货"按钮后，系统需要验证订单状态。仅支持已签收且签收时间不超过7天的订单申请退货。用户需选择退货原因（质量问题/七天无理由/发错货/其他），上传至少一张商品照片，并填写退货说明（不少于10个字）。提交后系统自动生成退货单号，并发送通知给商家。商家需在48小时内处理，超时未处理则自动同意退货。用户可在退货记录中查看处理进度，包括：待审核、商家同意、买家寄回、商家验货、退款完成等状态。退款金额按原支付路径原路返回，优惠券部分不予退还。若商家拒绝退货，用户可在72小时内发起平台介入申请，平台客服将在3个工作日内给出仲裁结果。整个退货流程中，用户和商家均可通过站内信进行沟通。`;

interface TaskInputProps {
  onSubmit: (requirement: string) => void;
  onLoadDemo?: () => void;
  isLoading?: boolean;
}

export function TaskInput({ onSubmit, onLoadDemo, isLoading = false }: TaskInputProps) {
  const [requirement, setRequirement] = useState(DEFAULT_REQUIREMENT);

  const handleSubmit = () => {
    if (requirement.trim()) {
      onSubmit(requirement);
    }
  };

  return (
    <Form layout="vertical" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Form.Item
        label="需求描述"
        style={{ flex: 1, marginBottom: 0, display: "flex", flexDirection: "column" }}
      >
        <Input.TextArea
          data-testid="requirement-input"
          placeholder="描述需要测试的功能或需求..."
          value={requirement}
          onChange={(e) => setRequirement(e.target.value)}
          disabled={isLoading}
          rows={8}
          style={{ flex: 1, resize: "none" }}
        />
      </Form.Item>

      <Form.Item style={{ marginTop: 16, marginBottom: 0 }}>
        <Space direction="vertical" style={{ width: "100%" }}>
          <Button
            data-testid="start-button"
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={handleSubmit}
            disabled={!requirement.trim() || isLoading}
            loading={isLoading}
            block
          >
            {isLoading ? "分析中..." : "开始分析"}
          </Button>

          {onLoadDemo && (
            <Button
              data-testid="demo-button"
              icon={<ExperimentOutlined />}
              onClick={onLoadDemo}
              disabled={isLoading}
              block
            >
              加载演示任务
            </Button>
          )}
        </Space>
      </Form.Item>
    </Form>
  );
}
