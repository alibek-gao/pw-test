import { FormEvent, useRef, useState } from "react";
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

export const CsvUploader = () => {
  const utils = trpc.useUtils();
  const { data: csvConfig, error: csvConfigError } = trpc.csv.config.useQuery();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const refreshDashboard = () =>
    Promise.all([
      utils.csv.listJobs.invalidate(),
      utils.csv.summary.invalidate(),
      utils.csv.domainCitationsCounts.invalidate(),
      utils.csv.lastUpdatedSeries.invalidate(),
      utils.csv.listRecords.invalidate(),
      utils.csv.rootDomains.invalidate(),
      utils.csv.topPagesByDomain.invalidate(),
      utils.csv.topModelsByDomain.invalidate(),
      utils.csv.aiModels.invalidate(),
    ]);

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
    setUploadProgress(0);

    try {
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `${apiUrl}/uploads/csv`);

        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            setUploadProgress(Math.round((e.loaded / e.total) * 100));
          }
        });

        xhr.upload.addEventListener("load", () => {
          setIsProcessing(true);
        });

        xhr.addEventListener("load", () => {
          const result = JSON.parse(xhr.responseText) as {
            processedRows?: number;
            failedRows?: number;
            message?: string;
          };
          if (xhr.status >= 200 && xhr.status < 300) {
            setUploadStatus(
              `Imported ${result.processedRows ?? 0} rows with ${result.failedRows ?? 0} errors.`,
            );
            setSelectedFile(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
            resolve();
          } else {
            reject(new Error(result.message ?? "CSV upload failed."));
          }
        });

        xhr.addEventListener("error", () =>
          reject(new Error("CSV upload failed.")),
        );
        xhr.addEventListener("abort", () =>
          reject(new Error("Upload cancelled.")),
        );

        xhr.send(formData);
      });

      await refreshDashboard();
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : "CSV upload failed.",
      );
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      setIsProcessing(false);
    }
  };

  const showInfo = Boolean(
    selectedFile || uploadStatus || uploadError || csvConfigError,
  );

  return (
    <div className="flex flex-col gap-2 rounded-md border border-stone-200 px-3 py-2">
      <form
        className="flex flex-col gap-2 md:flex-row md:items-center"
        onSubmit={uploadCsv}
      >
        <input
          accept=".csv,text/csv"
          className="max-w-full rounded-md border border-stone-200 bg-white px-2 py-1.5 text-xs text-gray-700"
          disabled={isUploading}
          ref={fileInputRef}
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

      {isUploading && !isProcessing ? (
        <div className="flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-stone-200">
            <div
              className="h-full rounded-full bg-gray-900 transition-all duration-150"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <span className="w-8 text-right text-xs text-gray-500">
            {uploadProgress}%
          </span>
        </div>
      ) : null}

      {isProcessing ? (
        <p className="text-xs text-emerald-700">
          Upload complete. <span className="animate-pulse">Processing...</span>
        </p>
      ) : null}

      {showInfo ? (
        <div className="text-xs text-gray-700">
          {selectedFile && !(isUploading || isProcessing) ? (
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
        </div>
      ) : null}
    </div>
  );
};
