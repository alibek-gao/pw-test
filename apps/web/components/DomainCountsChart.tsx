import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type DomainCountsChartProps = {
  data: { rootDomain: string; count: number }[] | undefined;
  isLoading: boolean;
};

const BAR_FILL = "#4f46e5";

export const DomainCountsChart = ({
  data,
  isLoading,
}: DomainCountsChartProps) => {
  if (isLoading) {
    return (
      <p className="px-3 py-8 text-center text-xs text-gray-500">
        Loading domains...
      </p>
    );
  }

  if (!data?.length) {
    return (
      <p className="px-3 py-8 text-center text-xs text-gray-500">
        No domain data yet.
      </p>
    );
  }

  const height = Math.max(180, data.length * 22 + 40);

  return (
    <div className="px-3 py-2" style={{ height }}>
      <ResponsiveContainer height="100%" width="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 16, bottom: 4, left: 4 }}
        >
          <CartesianGrid
            horizontal={false}
            stroke="#f1f5f9"
            strokeDasharray="2 2"
          />
          <XAxis
            allowDecimals={false}
            stroke="#9ca3af"
            tick={{ fill: "#6b7280", fontSize: 10 }}
            type="number"
          />
          <YAxis
            dataKey="rootDomain"
            stroke="#9ca3af"
            tick={{ fill: "#4b5563", fontSize: 10 }}
            type="category"
            width={120}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 6,
              border: "1px solid #e5e7eb",
              fontSize: 11,
              padding: "4px 8px",
            }}
            cursor={{ fill: "#f8fafc" }}
            formatter={(value) => [value as number, "Records"]}
          />
          <Bar dataKey="count" fill={BAR_FILL} radius={[0, 3, 3, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
