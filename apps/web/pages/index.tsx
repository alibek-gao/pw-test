import { CsvUploader } from "../components/CsvUploader";
import { DomainCountsChart } from "../components/DomainCountsChart";
import { LastUpdatedSeriesChart } from "../components/LastUpdatedSeriesChart";
import { trpc } from "../utils/trpc";

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;

  const megabytes = bytes / (1024 * 1024);
  return Number.isInteger(megabytes)
    ? `${megabytes} MB`
    : `${megabytes.toFixed(1)} MB`;
};

const formatDate = (value: string | null | Date) => {
  if (!value) return "No data";
  return value.toString().slice(0, 10);
};

const formatNumber = (value: number | null | undefined) =>
  value == null ? "No data" : new Intl.NumberFormat("en-US").format(value);

const statusClassName = (status: string) => {
  if (status === "COMPLETED") return "bg-emerald-100/70 text-emerald-700";
  if (status === "COMPLETED_WITH_ERRORS")
    return "bg-amber-100/70 text-amber-700";
  if (status === "FAILED") return "bg-red-100/70 text-red-700";
  return "bg-gray-100 text-gray-600";
};

export default function Home() {
  const { data: csvConfig } = trpc.csv.config.useQuery();
  const { data: jobs, isLoading: areJobsLoading } = trpc.csv.listJobs.useQuery({
    limit: 5,
  });
  const { data: summary, isLoading: isSummaryLoading } =
    trpc.csv.summary.useQuery();
  const { data: records, isLoading: areRecordsLoading } =
    trpc.csv.listRecords.useQuery({
      page: 1,
      pageSize: 10,
      sortBy: "createdAt",
      sortDirection: "desc",
    });
  const { data: domainCounts, isLoading: areDomainCountsLoading } =
    trpc.csv.domainCounts.useQuery({ limit: 10 });
  const { data: lastUpdatedSeries, isLoading: isLastUpdatedSeriesLoading } =
    trpc.csv.lastUpdatedSeries.useQuery();

  const metrics = [
    ["Records", formatNumber(summary?.totalRecords)],
    ["Domains", formatNumber(summary?.uniqueRootDomains)],
    [
      "Visibility",
      summary?.averageVisibilityScore == null
        ? "No data"
        : summary.averageVisibilityScore.toFixed(1),
    ],
    ["Citations", formatNumber(summary?.totalCitations)],
    ["Mentions", formatNumber(summary?.totalMentions)],
    [
      "Date Range",
      summary?.dateRange.from
        ? `${formatDate(summary.dateRange.from)} to ${formatDate(
            summary.dateRange.to,
          )}`
        : "No data",
    ],
  ];

  return (
    <main className="min-h-screen bg-stone-50 p-3 text-gray-900">
      <div className="mx-auto flex max-w-7xl flex-col gap-3">
        <header className="flex flex-col gap-3 rounded-lg border border-stone-200 bg-white px-3 py-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase text-gray-500">
              Promptwatch CSV
            </p>
            <h1 className="text-xl font-semibold text-gray-900">
              AI Visibility Dashboard
            </h1>
          </div>
          <CsvUploader />
        </header>

        <section className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          {metrics.map(([label, value]) => (
            <div
              className="rounded-lg border border-stone-200 bg-white px-3 py-3"
              key={label}
            >
              <p className="text-[10px] font-semibold uppercase text-gray-500">
                {label}
              </p>
              <p
                className="mt-1 truncate text-lg font-semibold text-gray-900"
                title={isSummaryLoading ? "Loading..." : value}
              >
                {isSummaryLoading ? "Loading..." : value}
              </p>
            </div>
          ))}
        </section>

        <section className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-lg border border-stone-200 bg-white">
            <div className="border-b border-stone-200 px-3 py-2">
              <h2 className="text-[10px] font-semibold uppercase text-gray-600">
                Records per day
              </h2>
            </div>
            <LastUpdatedSeriesChart
              data={lastUpdatedSeries}
              isLoading={isLastUpdatedSeriesLoading}
            />
          </div>
          <div className="rounded-lg border border-stone-200 bg-white">
            <div className="border-b border-stone-200 px-3 py-2">
              <h2 className="text-[10px] font-semibold uppercase text-gray-600">
                Top domains
              </h2>
            </div>
            <DomainCountsChart
              data={domainCounts}
              isLoading={areDomainCountsLoading}
            />
          </div>
        </section>

        <section className="grid gap-3 lg:grid-cols-[320px_1fr]">
          <div className="rounded-lg border border-stone-200 bg-white">
            <div className="border-b border-stone-200 px-3 py-2">
              <h2 className="text-[10px] font-semibold uppercase text-gray-600">
                Recent Imports
              </h2>
            </div>
            <div className="divide-y divide-stone-100">
              {areJobsLoading ? (
                <p className="px-3 py-3 text-xs text-gray-500">
                  Loading imports...
                </p>
              ) : null}
              {!areJobsLoading && !jobs?.length ? (
                <p className="px-3 py-3 text-xs text-gray-500">
                  No CSV imports yet.
                </p>
              ) : null}
              {jobs?.map((job) => (
                <div className="px-3 py-2" key={job.id}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-xs font-medium text-gray-800">
                      {job.fileName}
                    </p>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${statusClassName(
                        job.status,
                      )}`}
                    >
                      {job.status}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-gray-500">
                    {job._count.records} records · {job._count.errors} errors
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
            <div className="flex items-center justify-between border-b border-stone-200 px-3 py-2">
              <h2 className="text-[10px] font-semibold uppercase text-gray-600">
                Sources
              </h2>
              <p className="text-[10px] text-gray-500">
                Max upload{" "}
                {csvConfig ? formatBytes(csvConfig.maxCsvUploadBytes) : "..."}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="w-70 px-2 py-2 text-left text-[10px] font-medium uppercase text-gray-500">
                      URL
                    </th>
                    <th className="px-2 py-2 text-left text-[10px] font-medium uppercase text-gray-500">
                      AI Model
                    </th>
                    <th className="px-2 py-2 text-left text-[10px] font-medium uppercase text-gray-500">
                      Sentiment
                    </th>
                    <th className="px-2 py-2 text-left text-[10px] font-medium uppercase text-gray-500">
                      Visibility
                    </th>
                    <th className="px-2 py-2 text-left text-[10px] font-medium uppercase text-gray-500">
                      Citations
                    </th>
                    <th className="px-2 py-2 text-left text-[10px] font-medium uppercase text-gray-500">
                      Position
                    </th>
                    <th className="px-2 py-2 text-left text-[10px] font-medium uppercase text-gray-500">
                      Updated
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {areRecordsLoading ? (
                    <tr>
                      <td
                        className="px-2 py-3 text-xs text-gray-500"
                        colSpan={7}
                      >
                        Loading records...
                      </td>
                    </tr>
                  ) : null}
                  {!areRecordsLoading && !records?.records.length ? (
                    <tr>
                      <td
                        className="px-2 py-3 text-xs text-gray-500"
                        colSpan={7}
                      >
                        Upload a CSV to populate source rows.
                      </td>
                    </tr>
                  ) : null}
                  {records?.records.map((record) => (
                    <tr className="hover:bg-gray-50" key={record.id}>
                      <td className="w-70 max-w-70 px-2 py-1.5">
                        <div className="flex items-center gap-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            alt=""
                            className="h-5 w-5 rounded-sm border border-gray-200"
                            src={`https://www.google.com/s2/favicons?domain=${record.rootDomain}&sz=32`}
                          />
                          <div className="min-w-0">
                            <a
                              className="block truncate text-xs text-blue-600 hover:underline"
                              href={record.url}
                              rel="noreferrer"
                              target="_blank"
                            >
                              {record.title}
                            </a>
                            <p className="truncate text-[10px] text-gray-500">
                              {record.rootDomain}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-2 py-1.5">
                        <span className="rounded-full bg-indigo-100/70 px-2 py-0.5 text-[10px] font-medium text-indigo-700">
                          {record.aiModelMentioned}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-2 py-1.5">
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                          {record.sentiment}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-2 py-1.5 text-xs text-gray-700">
                        {record.visibilityScore}
                      </td>
                      <td className="whitespace-nowrap px-2 py-1.5 text-xs text-gray-700">
                        {formatNumber(record.citationsCount)}
                      </td>
                      <td className="whitespace-nowrap px-2 py-1.5 font-mono text-xs text-gray-700">
                        #{record.positionInResponse}
                      </td>
                      <td className="whitespace-nowrap px-2 py-1.5 text-xs text-gray-700">
                        {formatDate(record.lastUpdated)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
