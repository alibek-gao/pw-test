import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type LastUpdatedSeriesChartProps = {
  data: { date: string; count: number }[] | undefined;
  isLoading: boolean;
};

const formatTickDate = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};

export const LastUpdatedSeriesChart = ({
  data,
  isLoading,
}: LastUpdatedSeriesChartProps) => {
  const hasResolvedData = data !== undefined;

  if (isLoading && !hasResolvedData) {
    return (
      <p className="px-3 py-8 text-center text-xs text-gray-500">
        Loading timeline...
      </p>
    );
  }

  if (!data?.length) {
    return (
      <p className="px-3 py-8 text-center text-xs text-gray-500">
        No timeline data yet.
      </p>
    );
  }

  return (
    <div className="h-[220px] px-3 py-2">
      <ResponsiveContainer height="100%" width="100%">
        <LineChart
          data={data}
          margin={{ top: 8, right: 16, bottom: 4, left: -12 }}
        >
          <CartesianGrid stroke="#f1f5f9" strokeDasharray="2 2" />
          <XAxis
            dataKey="date"
            stroke="#9ca3af"
            tick={{ fill: "#6b7280", fontSize: 10 }}
            tickFormatter={formatTickDate}
          />
          <YAxis
            allowDecimals={false}
            stroke="#9ca3af"
            tick={{ fill: "#6b7280", fontSize: 10 }}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 6,
              border: "1px solid #e5e7eb",
              fontSize: 11,
              padding: "4px 8px",
            }}
            formatter={(value) => [value as number, "Records"]}
            labelFormatter={(value) => formatTickDate(value as string)}
          />
          <Line
            activeDot={{ r: 4 }}
            dataKey="count"
            dot={{ r: 2 }}
            stroke="#4f46e5"
            strokeWidth={2}
            type="monotone"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
