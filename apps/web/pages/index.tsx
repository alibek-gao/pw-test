import { FormEvent, useState } from "react";
import { apiUrl } from "../utils/api";
import { trpc } from "../utils/trpc";

const formatBytes = (bytes: number) => {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  const megabytes = bytes / (1024 * 1024);

  if (Number.isInteger(megabytes)) {
    return `${megabytes} MB`;
  }

  return `${megabytes.toFixed(1)} MB`;
};

const formatDate = (value: string | null) => {
  if (!value) {
    return "No data";
  }

  return value.slice(0, 10);
};

export default function Home() {
  const utils = trpc.useContext();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const {
    data: csvConfig,
    error: csvConfigError,
    isLoading: isCsvConfigLoading,
  } = trpc.csv.config.useQuery();
  const { data: jobs, isLoading: areJobsLoading } = trpc.csv.listJobs.useQuery({
    limit: 5,
  });
  const { data: summary, isLoading: isSummaryLoading } =
    trpc.csv.summary.useQuery();
  const { data: domainCounts, isLoading: areDomainCountsLoading } =
    trpc.csv.domainCounts.useQuery({ limit: 10 });
  const { data: lastUpdatedSeries, isLoading: isSeriesLoading } =
    trpc.csv.lastUpdatedSeries.useQuery();
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
        jobId?: string;
        status?: string;
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

  return (
    <main>
      <h1>CSV Upload</h1>

      <section>
        <h2>Upload CSV</h2>
        <form onSubmit={uploadCsv}>
          <input
            accept=".csv,text/csv"
            disabled={isUploading}
            onChange={(event) => {
              setSelectedFile(event.target.files?.[0] ?? null);
              setUploadStatus(null);
              setUploadError(null);
            }}
            type="file"
          />
          <button disabled={isUploading || !selectedFile} type="submit">
            {isUploading ? "Uploading..." : "Upload"}
          </button>
        </form>
        {selectedFile ? (
          <p>
            Selected: {selectedFile.name} ({formatBytes(selectedFile.size)})
          </p>
        ) : null}
        {uploadStatus ? <p>{uploadStatus}</p> : null}
        {uploadError ? <p>{uploadError}</p> : null}
      </section>

      <section>
        <h2>Upload Settings</h2>
        {isCsvConfigLoading ? <p>Loading upload settings...</p> : null}
        {csvConfigError ? <p>Could not load upload settings.</p> : null}
        {csvConfig ? (
          <>
            <p>
              Maximum CSV upload size:{" "}
              {formatBytes(csvConfig.maxCsvUploadBytes)}
            </p>
            <p>Expected columns: {csvConfig.expectedHeaders.length}</p>
          </>
        ) : null}
      </section>

      <section>
        <h2>Imports</h2>
        {areJobsLoading ? <p>Loading imports...</p> : null}
        {jobs?.length ? (
          <ul>
            {jobs.map((job) => (
              <li key={job.id}>
                {job.fileName} · {job.status} · {job._count.records} records
              </li>
            ))}
          </ul>
        ) : (
          <p>No CSV imports yet.</p>
        )}
      </section>

      <section>
        <h2>Summary</h2>
        {isSummaryLoading ? <p>Loading summary...</p> : null}
        {summary && summary.totalRecords > 0 ? (
          <dl>
            <dt>Total records</dt>
            <dd>{summary.totalRecords}</dd>
            <dt>Unique root domains</dt>
            <dd>{summary.uniqueRootDomains}</dd>
            <dt>Average visibility score</dt>
            <dd>{summary.averageVisibilityScore?.toFixed(1) ?? "No data"}</dd>
            <dt>Total citations</dt>
            <dd>{summary.totalCitations}</dd>
            <dt>Total mentions</dt>
            <dd>{summary.totalMentions}</dd>
            <dt>Date range</dt>
            <dd>
              {formatDate(summary.dateRange.from)} to{" "}
              {formatDate(summary.dateRange.to)}
            </dd>
          </dl>
        ) : (
          <p>Upload a CSV to populate summary metrics.</p>
        )}
      </section>

      <section>
        <h2>Domain Occurrences</h2>
        {areDomainCountsLoading ? <p>Loading domains...</p> : null}
        {domainCounts?.length ? (
          <ul>
            {domainCounts.map((domain) => (
              <li key={domain.rootDomain}>
                {domain.rootDomain}: {domain.count}
              </li>
            ))}
          </ul>
        ) : (
          <p>No domain data yet.</p>
        )}
      </section>

      <section>
        <h2>Last Updated Series</h2>
        {isSeriesLoading ? <p>Loading date series...</p> : null}
        {lastUpdatedSeries?.length ? (
          <ul>
            {lastUpdatedSeries.map((point) => (
              <li key={point.date}>
                {point.date}: {point.count}
              </li>
            ))}
          </ul>
        ) : (
          <p>No date series yet.</p>
        )}
      </section>

      <section>
        <h2>Records</h2>
        {areRecordsLoading ? <p>Loading records...</p> : null}
        {records?.records.length ? (
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Domain</th>
                <th>AI model</th>
                <th>Visibility</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {records.records.map((record) => (
                <tr key={record.id}>
                  <td>{record.title}</td>
                  <td>{record.rootDomain}</td>
                  <td>{record.aiModelMentioned}</td>
                  <td>{record.visibilityScore}</td>
                  <td>{formatDate(record.lastUpdated.toString())}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No records to display yet.</p>
        )}
      </section>
    </main>
  );
}
