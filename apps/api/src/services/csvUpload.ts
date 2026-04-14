import type { PrismaClient } from "@repo/database";
import type { ParsedUrlCsv } from "../csv/urlCsv.js";
import { parseUrlCsvContent } from "../csv/urlCsv.js";

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
    await prisma.urlRecord.deleteMany({
      where: { importJobId: importJob.id },
    });
    await prisma.importError.deleteMany({
      where: { importJobId: importJob.id },
    });
    await prisma.importJob.update({
      where: { id: importJob.id },
      data: {
        status: ImportStatus.FAILED,
        processedRows: 0,
        failedRows: 0,
        errorMessage:
          error instanceof Error ? error.message : "Unknown CSV import error.",
        completedAt: new Date(),
      },
    });

    throw error;
  }
};
