import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type RankedBarChartProps = {
  data: { label: string; value: number; fill?: string }[] | undefined;
  isLoading: boolean;
  emptyText?: string;
  loadingText?: string;
  valueLabel?: string;
  labelWidth?: number;
};

export const RankedBarChart = ({
  data,
  isLoading,
  emptyText = "No data yet.",
  loadingText = "Loading...",
  valueLabel = "Value",
  labelWidth = 140,
}: RankedBarChartProps) => {
  const hasResolvedData = data !== undefined;

  if (isLoading && !hasResolvedData) {
    return (
      <p className="px-3 py-8 text-center text-xs text-gray-500">
        {loadingText}
      </p>
    );
  }

  if (!data?.length) {
    return (
      <p className="px-3 py-8 text-center text-xs text-gray-500">{emptyText}</p>
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
            dataKey="label"
            stroke="#9ca3af"
            tick={{ fill: "#4b5563", fontSize: 10 }}
            type="category"
            width={labelWidth}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 6,
              border: "1px solid #e5e7eb",
              fontSize: 11,
              padding: "4px 8px",
            }}
            cursor={{ fill: "#f8fafc" }}
            formatter={(value) => [value as number, valueLabel]}
          />
          <Bar
            dataKey="value"
            fill="#4f46e5"
            shape={(props: any) => (
              <rect
                fill={props.fill}
                height={props.height}
                rx={3}
                width={Math.max(0, props.width)}
                x={props.x}
                y={props.y}
              />
            )}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
