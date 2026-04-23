import { CsvUploader } from "../components/CsvUploader";
import { DelayedLoadingText } from "../components/DelayedLoadingText";
import { DomainBreakdown } from "../components/DomainBreakdown";
import { DomainCitationsCountsChart } from "../components/DomainCitationsCountsChart";
import { LastUpdatedSeriesChart } from "../components/LastUpdatedSeriesChart";
import { RecordsTable } from "../components/RecordsTable";
import { trpc } from "../utils/trpc";

const statusClassName = (status: string) => {
  if (status === "COMPLETED") return "bg-emerald-100/70 text-emerald-700";
  if (status === "COMPLETED_WITH_ERRORS")
    return "bg-amber-100/70 text-amber-700";
  if (status === "FAILED") return "bg-red-100/70 text-red-700";
  return "bg-gray-100 text-gray-600";
};

export default function Home() {
  const {
    data: jobs,
    isFetching: areJobsFetching,
    isLoading: areJobsLoading,
  } = trpc.csv.listJobs.useQuery({ limit: 5 });
  const {
    data: domainCitationsCounts,
    isFetching: areDomainCitationsCountsFetching,
    isLoading: areDomainCitationsCountsLoading,
  } = trpc.csv.domainCitationsCounts.useQuery({ limit: 10 });
  const {
    data: lastUpdatedSeries,
    isFetching: isLastUpdatedSeriesFetching,
    isLoading: isLastUpdatedSeriesLoading,
  } = trpc.csv.lastUpdatedSeries.useQuery();
  const hasJobsData = jobs !== undefined;
  const hasDomainCitationsCountsData = domainCitationsCounts !== undefined;
  const hasLastUpdatedSeriesData = lastUpdatedSeries !== undefined;

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

        <section className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-lg border border-stone-200 bg-white">
            <div className="border-b border-stone-200 px-3 py-2">
              <h2 className="text-[10px] font-semibold uppercase text-gray-600">
                Records per day
                <DelayedLoadingText
                  hasData={hasLastUpdatedSeriesData}
                  isLoading={isLastUpdatedSeriesFetching}
                />
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
                <DelayedLoadingText
                  hasData={hasDomainCitationsCountsData}
                  isLoading={areDomainCitationsCountsFetching}
                />
              </h2>
            </div>
            <DomainCitationsCountsChart
              data={domainCitationsCounts}
              isLoading={areDomainCitationsCountsLoading}
            />
          </div>
        </section>

        <DomainBreakdown />

        <section className="grid gap-3 lg:grid-cols-[320px_1fr]">
          <div className="rounded-lg border border-stone-200 bg-white">
            <div className="border-b border-stone-200 px-3 py-2">
              <h2 className="text-[10px] font-semibold uppercase text-gray-600">
                Recent Imports
                <DelayedLoadingText
                  hasData={hasJobsData}
                  isLoading={areJobsFetching}
                />
              </h2>
            </div>
            <div className="divide-y divide-stone-100">
              {areJobsLoading && !hasJobsData ? (
                <p className="px-3 py-3 text-xs text-gray-500">
                  Loading imports...
                </p>
              ) : null}
              {(!areJobsLoading || hasJobsData) && !jobs?.length ? (
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
