import { Table, Tag, Typography } from "antd";

const { Text } = Typography;

interface CoverageEntry {
  requirementId: string;
  caseIds: string[];
}

interface CoverageMatrixProps {
  matrix: CoverageEntry[];
}

export function CoverageMatrix({ matrix }: CoverageMatrixProps) {
  const columns = [
    {
      title: "需求点",
      dataIndex: "requirementId",
      key: "requirementId",
      render: (text: string) => <Text strong style={{ fontSize: 12 }}>{text}</Text>,
    },
    {
      title: "覆盖用例",
      dataIndex: "caseIds",
      key: "caseIds",
      render: (ids: string[]) => (
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {ids.map((id) => (
            <Tag key={id} color="blue" style={{ margin: 0 }}>
              {id}
            </Tag>
          ))}
        </div>
      ),
    },
    {
      title: "覆盖度",
      key: "coverage",
      render: (_: unknown, record: CoverageEntry) => {
        const count = record.caseIds.length;
        const color = count >= 2 ? "success" : count === 1 ? "warning" : "error";
        const label = count >= 2 ? "充分" : count === 1 ? "部分" : "缺失";
        return <Tag color={color}>{label} ({count})</Tag>;
      },
    },
  ];

  return (
    <Table
      dataSource={matrix}
      columns={columns}
      rowKey="requirementId"
      size="small"
      pagination={false}
    />
  );
}
