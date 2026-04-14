import { z } from "zod";

export const jobScopedInput = z
  .object({
    jobId: z.string().min(1).optional(),
  })
  .optional();

export const listJobsInput = z
  .object({
    limit: z.number().int().min(1).max(50).default(10),
  })
  .optional();

export const jobStatusInput = z.object({
  jobId: z.string().min(1),
});

export const listRecordsInput = z.object({
  jobId: z.string().min(1).optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(25),
  sortBy: z
    .enum([
      "createdAt",
      "lastUpdated",
      "rootDomain",
      "aiModelMentioned",
      "visibilityScore",
      "citationsCount",
      "mentionsCount",
      "positionInResponse",
    ])
    .default("createdAt"),
  sortDirection: z.enum(["asc", "desc"]).default("desc"),
  filters: z
    .object({
      aiModelMentioned: z.string().min(1).optional(),
      sentiment: z.string().min(1).optional(),
      geographicRegion: z.string().min(1).optional(),
      rootDomain: z.string().min(1).optional(),
    })
    .optional(),
});

export const domainCountsInput = z
  .object({
    jobId: z.string().min(1).optional(),
    limit: z.number().int().min(1).max(50).default(15),
  })
  .optional();

export const importErrorsInput = z.object({
  jobId: z.string().min(1),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(25),
});

export type ListJobsInput = z.infer<typeof listJobsInput>;
export type ListRecordsInput = z.infer<typeof listRecordsInput>;
export type DomainCountsInput = z.infer<typeof domainCountsInput>;
export type ImportErrorsInput = z.infer<typeof importErrorsInput>;
