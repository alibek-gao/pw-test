import { CsvUploader } from "../components/CsvUploader";
import { DomainBreakdown } from "../components/DomainBreakdown";
import { DomainCountsChart } from "../components/DomainCountsChart";
import { LastUpdatedSeriesChart } from "../components/LastUpdatedSeriesChart";
import { RecordsTable } from "../components/RecordsTable";
import { trpc } from "../utils/trpc";

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
  const { data: jobs, isLoading: areJobsLoading } = trpc.csv.listJobs.useQuery({
    limit: 5,
  });
  const { data: summary, isLoading: isSummaryLoading } =
    trpc.csv.summary.useQuery();
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

        <DomainBreakdown />

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

          <RecordsTable />
        </section>
      </div>
    </main>
  );
}
