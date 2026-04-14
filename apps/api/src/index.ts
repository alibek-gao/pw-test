import Fastify from "fastify";
import { fastifyTRPCPlugin } from "@trpc/server/adapters/fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import { uploadConfig } from "./config.js";
import { appRouter } from "./routers/index.js";
import {
  CsvUploadError,
  importUrlCsv,
  isCsvFile,
} from "./services/csvUpload.js";
import { createContext } from "./trpc.js";

// Export the router type for use in frontend
export type { AppRouter } from "./routers/index.js";

const fastify = Fastify({
  maxParamLength: 5000,
  logger: true,
});

const start = async () => {
  try {
    // Register CORS
    await fastify.register(cors, {
      origin:
        process.env.NODE_ENV === "production"
          ? ["http://localhost:3000"] // Add your production domains here
          : true,
    });

    await fastify.register(multipart, {
      limits: {
        fileSize: uploadConfig.maxCsvUploadBytes,
        files: 1,
      },
    });

    // Register tRPC
    await fastify.register(fastifyTRPCPlugin, {
      prefix: "/trpc",
      trpcOptions: {
        router: appRouter,
        createContext,
        onError: ({ path, error }: { path?: string; error: unknown }) => {
          console.error(`❌ tRPC failed on ${path ?? "<no-path>"}:`, error);
        },
      },
    });

    // Health check endpoint
    fastify.get("/health", async () => {
      return { status: "ok", timestamp: new Date().toISOString() };
    });

    fastify.post("/uploads/csv", async (request, reply) => {
      try {
        const file = await request.file();

        if (!file) {
          throw new CsvUploadError("CSV file is required.");
        }

        if (!isCsvFile(file.filename, file.mimetype)) {
          throw new CsvUploadError("Only CSV files are supported.");
        }

        const buffer = await file.toBuffer();
        const ctx = await createContext();
        const importJob = await importUrlCsv(ctx.prisma, {
          fileName: file.filename,
          content: buffer.toString("utf8"),
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
        if (error instanceof CsvUploadError) {
          return reply.status(error.statusCode).send({
            message: error.message,
          });
        }

        request.log.error(error);

        return reply.status(500).send({
          message: "CSV upload failed.",
        });
      }
    });

    const port = process.env.PORT ? parseInt(process.env.PORT) : 4000;
    const host = process.env.HOST ?? "0.0.0.0";

    await fastify.listen({ port, host });
    console.log(`🚀 Server listening on http://${host}:${port}`);
    console.log(`📡 tRPC endpoint: http://${host}:${port}/trpc`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
