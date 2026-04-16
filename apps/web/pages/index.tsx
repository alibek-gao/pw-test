import { FormEvent, useState } from "react";
import { apiUrl } from "../utils/api";
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
  const utils = trpc.useContext();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const { data: csvConfig, error: csvConfigError } = trpc.csv.config.useQuery();
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

  const refreshDashboard = async () => {
    await Promise.all([
      utils.csv.listJobs.invalidate(),
      utils.csv.summary.invalidate(),
      utils.csv.domainCounts.invalidate(),
      utils.csv.lastUpdatedSeries.invalidate(),
      utils.csv.listRecords.invalidate(),
    ]);
  };

  const uploadCsv = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setUploadStatus(null);
    setUploadError(null);

    if (!selectedFile) {
      setUploadError("Choose a CSV file first.");
      return;
    }

    if (!selectedFile.name.toLowerCase().endsWith(".csv")) {
      setUploadError("Only CSV files are supported.");
      return;
    }

    if (
      csvConfig?.maxCsvUploadBytes &&
      selectedFile.size > csvConfig.maxCsvUploadBytes
    ) {
      setUploadError(
        `File is too large. Maximum size is ${formatBytes(
          csvConfig.maxCsvUploadBytes,
        )}.`,
      );
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);
    setIsUploading(true);

    try {
      const response = await fetch(`${apiUrl}/uploads/csv`, {
        method: "POST",
        body: formData,
      });
      const result = (await response.json()) as {
        processedRows?: number;
        failedRows?: number;
        message?: string;
      };

      if (!response.ok) {
        throw new Error(result.message ?? "CSV upload failed.");
      }

      setUploadStatus(
        `Imported ${result.processedRows ?? 0} rows with ${
          result.failedRows ?? 0
        } errors.`,
      );
      setSelectedFile(null);
      await refreshDashboard();
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : "CSV upload failed.",
      );
    } finally {
      setIsUploading(false);
    }
  };

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

          <form
            className="flex flex-col gap-2 md:flex-row"
            onSubmit={uploadCsv}
          >
            <input
              accept=".csv,text/csv"
              className="max-w-full rounded-md border border-stone-200 bg-white px-2 py-1.5 text-xs text-gray-700"
              disabled={isUploading}
              onChange={(event) => {
                setSelectedFile(event.target.files?.[0] ?? null);
                setUploadStatus(null);
                setUploadError(null);
              }}
              type="file"
            />
            <button
              className="rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white disabled:cursor-not-allowed disabled:bg-gray-300"
              disabled={isUploading || !selectedFile}
              type="submit"
            >
              {isUploading ? "Uploading..." : "Upload CSV"}
            </button>
          </form>
        </header>

        {selectedFile || uploadStatus || uploadError || csvConfigError ? (
          <section className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs text-gray-700">
            {selectedFile ? (
              <p>
                Selected: {selectedFile.name} ({formatBytes(selectedFile.size)})
              </p>
            ) : null}
            {uploadStatus ? (
              <p className="text-emerald-700">{uploadStatus}</p>
            ) : null}
            {uploadError ? <p className="text-red-700">{uploadError}</p> : null}
            {csvConfigError ? (
              <p className="text-red-700">Could not load upload settings.</p>
            ) : null}
          </section>
        ) : null}

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
                    <th className="w-[280px] px-2 py-2 text-left text-[10px] font-medium uppercase text-gray-500">
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
                      <td className="w-[280px] max-w-[280px] px-2 py-1.5">
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
