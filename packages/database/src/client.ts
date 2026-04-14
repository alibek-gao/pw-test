import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";

config({ path: fileURLToPath(new URL("../.env", import.meta.url)) });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL is required. Add it to packages/database/.env or your shell environment.",
  );
}

const prismaClientSingleton = () => {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
};

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

const globalForPrisma = global as typeof global & {
  prismaGlobal?: PrismaClientSingleton;
};

export const prisma: PrismaClientSingleton =
  globalForPrisma.prismaGlobal ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") globalForPrisma.prismaGlobal = prisma;

export * from "../generated/prisma/client.js";

export { PrismaClient };
