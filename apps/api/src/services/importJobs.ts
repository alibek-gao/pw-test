import type { PrismaClient } from "@repo/database";
import type { ImportErrorsInput, ListJobsInput } from "../schemas/csv.js";

export const listJobs = (prisma: PrismaClient, input: ListJobsInput) =>
  prisma.importJob.findMany({
    orderBy: { createdAt: "desc" },
    take: input?.limit ?? 10,
    include: {
      _count: {
        select: {
          errors: true,
          records: true,
        },
      },
    },
  });

export const getJobStatus = (prisma: PrismaClient, jobId: string) =>
  prisma.importJob.findUnique({
    where: { id: jobId },
    include: {
      _count: {
        select: {
          errors: true,
          records: true,
        },
      },
    },
  });

export const listImportErrors = async (
  prisma: PrismaClient,
  input: ImportErrorsInput,
) => {
  const where = { importJobId: input.jobId };

  const [errors, totalCount] = await Promise.all([
    prisma.importError.findMany({
      where,
      orderBy: { rowNumber: "asc" },
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
    }),
    prisma.importError.count({ where }),
  ]);

  return {
    errors,
    totalCount,
    page: input.page,
    pageSize: input.pageSize,
    pageCount: Math.ceil(totalCount / input.pageSize),
  };
};
