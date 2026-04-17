import { uploadConfig } from "../config.js";
import {
  domainCountsInput,
  importErrorsInput,
  jobScopedInput,
  jobStatusInput,
  listJobsInput,
  listRecordsInput,
  topByDomainInput,
} from "../schemas/csv.js";
import {
  getDomainCounts,
  getLastUpdatedSeries,
  getRootDomains,
  getSummary,
  getTopModelsByDomain,
  getTopPagesByDomain,
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

  summary: publicProcedure
    .input(jobScopedInput)
    .query(async ({ ctx, input }) => {
      return getSummary(ctx.prisma, input?.jobId);
    }),

  domainCounts: publicProcedure
    .input(domainCountsInput)
    .query(({ ctx, input }) => getDomainCounts(ctx.prisma, input)),

  lastUpdatedSeries: publicProcedure
    .input(jobScopedInput)
    .query(({ ctx, input }) => getLastUpdatedSeries(ctx.prisma, input?.jobId)),

  rootDomains: publicProcedure
    .input(jobScopedInput)
    .query(({ ctx, input }) => getRootDomains(ctx.prisma, input?.jobId)),

  topPagesByDomain: publicProcedure
    .input(topByDomainInput)
    .query(({ ctx, input }) => getTopPagesByDomain(ctx.prisma, input)),

  topModelsByDomain: publicProcedure
    .input(topByDomainInput)
    .query(({ ctx, input }) => getTopModelsByDomain(ctx.prisma, input)),

  importErrors: publicProcedure
    .input(importErrorsInput)
    .query(({ ctx, input }) => listImportErrors(ctx.prisma, input)),
});
