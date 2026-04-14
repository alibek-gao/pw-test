import { trpc } from "../utils/trpc";

const formatBytes = (bytes: number) => {
  const megabytes = bytes / (1024 * 1024);

  if (Number.isInteger(megabytes)) {
    return `${megabytes} MB`;
  }

  return `${megabytes.toFixed(1)} MB`;
};

export default function Home() {
  const {
    data: csvConfig,
    error: csvConfigError,
    isLoading: isCsvConfigLoading,
  } = trpc.csv.config.useQuery();

  return (
    <div>
      <h1>CSV Upload</h1>
      <section>
        <h2>CSV upload settings</h2>
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
    </div>
  );
}
