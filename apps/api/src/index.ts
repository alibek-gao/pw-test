import Fastify from "fastify";
import { fastifyTRPCPlugin } from "@trpc/server/adapters/fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import { uploadConfig } from "./config.js";
import { appRouter } from "./routers/index.js";
import { registerCsvUploadRoutes } from "./routes/csvUpload.js";
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

    await registerCsvUploadRoutes(fastify);

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
