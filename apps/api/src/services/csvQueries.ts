import type { PrismaClient } from "@repo/database";
import type { DomainCountsInput, ListRecordsInput } from "../schemas/csv.js";

const getJobScopedWhere = (jobId?: string) =>
  jobId ? { importJobId: jobId } : {};

type CountByAiModel = {
  aiModelMentioned: string;
  _count: { _all: number };
};

type CountBySentiment = {
  sentiment: string;
  _count: { _all: number };
};

type CountByRegion = {
  geographicRegion: string;
  _count: { _all: number };
};

type CountByRootDomain = {
  rootDomain: string;
  _count: { _all: number };
};

type CountByLastUpdated = {
  lastUpdated: Date;
  _count: { _all: number };
};

export const listRecords = async (
  prisma: PrismaClient,
  input: ListRecordsInput,
) => {
  const where = {
    ...getJobScopedWhere(input.jobId),
    ...(input.filters?.aiModelMentioned
      ? { aiModelMentioned: input.filters.aiModelMentioned }
      : {}),
    ...(input.filters?.sentiment ? { sentiment: input.filters.sentiment } : {}),
    ...(input.filters?.geographicRegion
      ? { geographicRegion: input.filters.geographicRegion }
      : {}),
    ...(input.filters?.rootDomain
      ? { rootDomain: input.filters.rootDomain }
      : {}),
  };

  const [records, totalCount] = await Promise.all([
    prisma.urlRecord.findMany({
      where,
      orderBy: { [input.sortBy]: input.sortDirection },
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
    }),
    prisma.urlRecord.count({ where }),
  ]);

  return {
    records,
    totalCount,
    page: input.page,
    pageSize: input.pageSize,
    pageCount: Math.ceil(totalCount / input.pageSize),
  };
};

export const getSummary = async (prisma: PrismaClient, jobId?: string) => {
  const where = getJobScopedWhere(jobId);

  const [
    totalRecords,
    rootDomains,
    visibility,
    citations,
    mentions,
    dateRange,
    aiModels,
    sentiments,
    regions,
  ] = await Promise.all([
    prisma.urlRecord.count({ where }),
    prisma.urlRecord.groupBy({
      by: ["rootDomain"],
      where,
    }),
    prisma.urlRecord.aggregate({
      where,
      _avg: { visibilityScore: true },
    }),
    prisma.urlRecord.aggregate({
      where,
      _sum: { citationsCount: true },
    }),
    prisma.urlRecord.aggregate({
      where,
      _sum: { mentionsCount: true },
    }),
    prisma.urlRecord.aggregate({
      where,
      _min: { lastUpdated: true },
      _max: { lastUpdated: true },
    }),
    prisma.urlRecord.groupBy({
      by: ["aiModelMentioned"],
      where,
      _count: { _all: true },
      orderBy: { _count: { aiModelMentioned: "desc" } },
    }),
    prisma.urlRecord.groupBy({
      by: ["sentiment"],
      where,
      _count: { _all: true },
      orderBy: { _count: { sentiment: "desc" } },
    }),
    prisma.urlRecord.groupBy({
      by: ["geographicRegion"],
      where,
      _count: { _all: true },
      orderBy: { _count: { geographicRegion: "desc" } },
    }),
  ]);

  return {
    totalRecords,
    uniqueRootDomains: rootDomains.length,
    averageVisibilityScore: visibility._avg.visibilityScore,
    totalCitations: citations._sum.citationsCount ?? 0,
    totalMentions: mentions._sum.mentionsCount ?? 0,
    dateRange: {
      from: dateRange._min.lastUpdated?.toISOString() ?? null,
      to: dateRange._max.lastUpdated?.toISOString() ?? null,
    },
    aiModels: (aiModels as CountByAiModel[]).map((item) => ({
      name: item.aiModelMentioned,
      count: item._count._all,
    })),
    sentiments: (sentiments as CountBySentiment[]).map((item) => ({
      name: item.sentiment,
      count: item._count._all,
    })),
    regions: (regions as CountByRegion[]).map((item) => ({
      name: item.geographicRegion,
      count: item._count._all,
    })),
  };
};

export const getDomainCounts = (
  prisma: PrismaClient,
  input: DomainCountsInput,
) =>
  prisma.urlRecord
    .groupBy({
      by: ["rootDomain"],
      where: getJobScopedWhere(input?.jobId),
      _count: { _all: true },
      orderBy: { _count: { rootDomain: "desc" } },
      take: input?.limit ?? 15,
    })
    .then((domains: CountByRootDomain[]) =>
      domains.map((domain) => ({
        rootDomain: domain.rootDomain,
        count: domain._count._all,
      })),
    );

export const getLastUpdatedSeries = (prisma: PrismaClient, jobId?: string) =>
  prisma.urlRecord
    .groupBy({
      by: ["lastUpdated"],
      where: getJobScopedWhere(jobId),
      _count: { _all: true },
      orderBy: { lastUpdated: "asc" },
    })
    .then((dates: CountByLastUpdated[]) =>
      dates.map((date) => ({
        date: date.lastUpdated.toISOString().slice(0, 10),
        count: date._count._all,
      })),
    );
