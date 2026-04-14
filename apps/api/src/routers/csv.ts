import { uploadConfig } from "../config.js";
import {
  domainCountsInput,
  importErrorsInput,
  jobScopedInput,
  jobStatusInput,
  listJobsInput,
  listRecordsInput,
} from "../schemas/csv.js";
import {
  getDomainCounts,
  getLastUpdatedSeries,
  getSummary,
  listRecords,
} from "../services/csvQueries.js";
import {
  getJobStatus,
  listImportErrors,
  listJobs,
} from "../services/importJobs.js";
import { publicProcedure, router } from "../trpc.js";

export const csvRouter = router({
  config: publicProcedure.query(() => uploadConfig),

  listJobs: publicProcedure
    .input(listJobsInput)
    .query(({ ctx, input }) => listJobs(ctx.prisma, input)),

  jobStatus: publicProcedure
    .input(jobStatusInput)
    .query(({ ctx, input }) => getJobStatus(ctx.prisma, input.jobId)),

  listRecords: publicProcedure
    .input(listRecordsInput)
    .query(({ ctx, input }) => listRecords(ctx.prisma, input)),

  summary: publicProcedure.input(jobScopedInput).query(async ({ ctx, input }) => {
    return getSummary(ctx.prisma, input?.jobId);
  }),

  domainCounts: publicProcedure
    .input(domainCountsInput)
    .query(({ ctx, input }) => getDomainCounts(ctx.prisma, input)),

  lastUpdatedSeries: publicProcedure
    .input(jobScopedInput)
    .query(({ ctx, input }) => getLastUpdatedSeries(ctx.prisma, input?.jobId)),

  importErrors: publicProcedure
    .input(importErrorsInput)
    .query(({ ctx, input }) => listImportErrors(ctx.prisma, input)),
});
