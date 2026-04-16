import type { Readable } from "node:stream";
import type { PrismaClient } from "@repo/database";
import type {
  ParsedUrlCsv,
  ParsedUrlCsvRecord,
  UrlCsvRowError,
} from "../csv/urlCsv.js";
import { parseUrlCsvContent, parseUrlCsvStream } from "../csv/urlCsv.js";

const CSV_BATCH_SIZE = 1_000;
const ImportStatus = {
  PROCESSING: "PROCESSING",
  COMPLETED: "COMPLETED",
  COMPLETED_WITH_ERRORS: "COMPLETED_WITH_ERRORS",
  FAILED: "FAILED",
} as const;

export class CsvUploadError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

export class CsvUploadCancelledError extends Error {
  constructor(message = "CSV upload was cancelled.") {
    super(message);
  }
}

export const isCsvFile = (filename: string, mimetype: string) => {
  const lowerCaseFileName = filename.toLowerCase();

  return (
    lowerCaseFileName.endsWith(".csv") ||
    mimetype === "text/csv" ||
    mimetype === "application/csv" ||
    mimetype === "application/vnd.ms-excel"
  );
};

const createRecords = async (
  prisma: PrismaClient,
  importJobId: string,
  parsed: ParsedUrlCsv,
) => {
  for (let index = 0; index < parsed.records.length; index += CSV_BATCH_SIZE) {
    const batch = parsed.records.slice(index, index + CSV_BATCH_SIZE);

    await prisma.urlRecord.createMany({
      data: batch.map((record) => ({
        ...record,
        importJobId,
      })),
    });
  }
};

const createRecordBatch = (
  prisma: PrismaClient,
  importJobId: string,
  batch: ParsedUrlCsvRecord[],
) => {
  if (batch.length === 0) {
    return Promise.resolve();
  }

  return prisma.urlRecord.createMany({
    data: batch.map((record) => ({
      ...record,
      importJobId,
    })),
  });
};

const createErrors = async (
  prisma: PrismaClient,
  importJobId: string,
  parsed: ParsedUrlCsv,
) => {
  for (let index = 0; index < parsed.errors.length; index += CSV_BATCH_SIZE) {
    const batch = parsed.errors.slice(index, index + CSV_BATCH_SIZE);

    await prisma.importError.createMany({
      data: batch.map((error) => ({
        importJobId,
        rowNumber: error.rowNumber,
        message: error.message,
        rawRow:
          error.rawRow === undefined
            ? undefined
            : JSON.parse(JSON.stringify(error.rawRow)),
      })),
    });
  }
};

const createErrorBatch = (
  prisma: PrismaClient,
  importJobId: string,
  batch: UrlCsvRowError[],
) => {
  if (batch.length === 0) {
    return Promise.resolve();
  }

  return prisma.importError.createMany({
    data: batch.map((error) => ({
      importJobId,
      rowNumber: error.rowNumber,
      message: error.message,
      rawRow:
        error.rawRow === undefined
          ? undefined
          : JSON.parse(JSON.stringify(error.rawRow)),
    })),
  });
};

const cleanupFailedImport = (
  prisma: PrismaClient,
  input: {
    importJobId: string;
    errorMessage: string;
  },
) =>
  prisma.$transaction([
    prisma.urlRecord.deleteMany({
      where: { importJobId: input.importJobId },
    }),
    prisma.importError.deleteMany({
      where: { importJobId: input.importJobId },
    }),
    prisma.importJob.update({
      where: { id: input.importJobId },
      data: {
        status: ImportStatus.FAILED,
        processedRows: 0,
        failedRows: 0,
        errorMessage: input.errorMessage,
        completedAt: new Date(),
      },
    }),
  ]);

const getImportErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Unknown CSV import error.";

export const importUrlCsv = async (
  prisma: PrismaClient,
  input: {
    fileName: string;
    content: string;
  },
) => {
  const importJob = await prisma.importJob.create({
    data: {
      fileName: input.fileName,
      status: ImportStatus.PROCESSING,
      startedAt: new Date(),
    },
  });

  try {
    const parsed = parseUrlCsvContent(input.content);

    await createRecords(prisma, importJob.id, parsed);
    await createErrors(prisma, importJob.id, parsed);

    const status =
      parsed.errors.length > 0
        ? ImportStatus.COMPLETED_WITH_ERRORS
        : ImportStatus.COMPLETED;

    return prisma.importJob.update({
      where: { id: importJob.id },
      data: {
        status,
        totalRows: parsed.records.length + parsed.errors.length,
        processedRows: parsed.records.length,
        failedRows: parsed.errors.length,
        completedAt: new Date(),
      },
      include: {
        _count: {
          select: {
            errors: true,
            records: true,
          },
        },
      },
    });
  } catch (error) {
    await cleanupFailedImport(prisma, {
      importJobId: importJob.id,
      errorMessage: getImportErrorMessage(error),
    });

    throw error;
  }
};

export const importUrlCsvStream = async (
  prisma: PrismaClient,
  input: {
    fileName: string;
    stream: Readable;
    signal?: AbortSignal;
  },
) => {
  const importJob = await prisma.importJob.create({
    data: {
      fileName: input.fileName,
      status: ImportStatus.PROCESSING,
      startedAt: new Date(),
    },
  });
  const recordBatch: ParsedUrlCsvRecord[] = [];
  const errorBatch: UrlCsvRowError[] = [];

  if (input.signal?.aborted) {
    await cleanupFailedImport(prisma, {
      importJobId: importJob.id,
      errorMessage: "CSV upload was cancelled before import started.",
    });
    throw new CsvUploadCancelledError(
      "CSV upload was cancelled before import started.",
    );
  }

  const cancelImport = () => {
    input.stream.destroy(new CsvUploadCancelledError());
  };

  input.signal?.addEventListener("abort", cancelImport, { once: true });

  const flushRecords = async () => {
    if (recordBatch.length === 0) return;

    const batch = recordBatch.splice(0, recordBatch.length);
    await createRecordBatch(prisma, importJob.id, batch);
  };
  const flushErrors = async () => {
    if (errorBatch.length === 0) return;

    const batch = errorBatch.splice(0, errorBatch.length);
    await createErrorBatch(prisma, importJob.id, batch);
  };

  try {
    const stats = await parseUrlCsvStream(input.stream, {
      onRecord: async (record) => {
        recordBatch.push(record);

        if (recordBatch.length >= CSV_BATCH_SIZE) {
          await flushRecords();
        }
      },
      onError: async (error) => {
        errorBatch.push(error);

        if (errorBatch.length >= CSV_BATCH_SIZE) {
          await flushErrors();
        }
      },
    });

    await flushRecords();
    await flushErrors();

    const status =
      stats.failedRows > 0
        ? ImportStatus.COMPLETED_WITH_ERRORS
        : ImportStatus.COMPLETED;

    return prisma.importJob.update({
      where: { id: importJob.id },
      data: {
        status,
        totalRows: stats.totalRows,
        processedRows: stats.processedRows,
        failedRows: stats.failedRows,
        completedAt: new Date(),
      },
      include: {
        _count: {
          select: {
            errors: true,
            records: true,
          },
        },
      },
    });
  } catch (error) {
    await cleanupFailedImport(prisma, {
      importJobId: importJob.id,
      errorMessage: getImportErrorMessage(error),
    });

    throw error;
  } finally {
    input.signal?.removeEventListener("abort", cancelImport);
  }
};
