import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  CsvUploadCancelledError,
  CsvUploadError,
  importUrlCsvStream,
  isCsvFile,
} from "../services/csvUpload.js";
import { createContext } from "../trpc.js";

export const csvUploadHandler = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  const abortController = new AbortController();
  const abortUpload = () => {
    abortController.abort();
  };

  request.raw.once("aborted", abortUpload);

  try {
    const file = await request.file();

    if (!file) {
      throw new CsvUploadError("CSV file is required.");
    }

    if (!isCsvFile(file.filename, file.mimetype)) {
      throw new CsvUploadError("Only CSV files are supported.");
    }

    const ctx = await createContext();
    const importJob = await importUrlCsvStream(ctx.prisma, {
      fileName: file.filename,
      stream: file.file,
      signal: abortController.signal,
    });

    return reply.send({
      jobId: importJob.id,
      status: importJob.status,
      processedRows: importJob.processedRows,
      failedRows: importJob.failedRows,
      recordCount: importJob._count.records,
      errorCount: importJob._count.errors,
    });
  } catch (error) {
    if (error instanceof CsvUploadCancelledError) {
      request.log.info(error, "CSV upload cancelled.");

      if (abortController.signal.aborted || reply.raw.writableEnded) {
        return reply;
      }

      return reply.status(499).send({
        message: error.message,
      });
    }

    if (error instanceof CsvUploadError) {
      return reply.status(error.statusCode).send({
        message: error.message,
      });
    }

    request.log.error(error);

    return reply.status(500).send({
      message: "CSV upload failed.",
    });
  } finally {
    request.raw.off("aborted", abortUpload);
  }
};

export const registerCsvUploadRoutes = async (fastify: FastifyInstance) => {
  fastify.post("/uploads/csv", csvUploadHandler);
};
