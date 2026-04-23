import type { PrismaClient } from "@repo/database";
import type {
  DomainCountsInput,
  ListRecordsInput,
  SummaryInput,
  TopByDomainInput,
} from "../schemas/csv.js";

const visibleImportStatuses = ["COMPLETED", "COMPLETED_WITH_ERRORS"] as const;

// Keeps partial failed imports out of reads; optimize later with latest-job scoping or a denormalized visibility flag if needed.
const getVisibleRecordsWhere = (jobId?: string) => ({
  ...(jobId ? { importJobId: jobId } : {}),
  importJob: {
    status: {
      in: [...visibleImportStatuses],
    },
  },
});

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
  _sum: { citationsCount: number | null };
};

type CountByLastUpdated = {
  lastUpdated: Date;
  _count: { _all: number };
};

type SumByPage = {
  url: string;
  title: string;
  _sum: { citationsCount?: number | null; mentionsCount?: number | null };
};

type SumByModel = {
  aiModelMentioned: string;
  _sum: { citationsCount?: number | null; mentionsCount?: number | null };
};

type SumByCategory = {
  queryCategory: string;
  _sum: { citationsCount?: number | null; mentionsCount?: number | null };
};

type SumByRootDomain = {
  rootDomain: string;
  _sum: { citationsCount?: number | null; mentionsCount?: number | null };
};

export const listRecords = async (
  prisma: PrismaClient,
  input: ListRecordsInput,
) => {
  const where = {
    ...getVisibleRecordsWhere(input.jobId),
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
    ...(input.search
      ? {
          OR: [
            { title: { contains: input.search, mode: "insensitive" as const } },
            { url: { contains: input.search, mode: "insensitive" as const } },
            {
              rootDomain: {
                contains: input.search,
                mode: "insensitive" as const,
              },
            },
            {
              aiModelMentioned: {
                contains: input.search,
                mode: "insensitive" as const,
              },
            },
          ],
        }
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

export const getSummary = async (
  prisma: PrismaClient,
  input?: SummaryInput,
) => {
  const where = {
    ...getVisibleRecordsWhere(input?.jobId),
    ...(input?.rootDomain ? { rootDomain: input.rootDomain } : {}),
  };

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

export const getDomainCitationsCounts = (
  prisma: PrismaClient,
  input: DomainCountsInput,
) =>
  prisma.urlRecord
    .groupBy({
      by: ["rootDomain"],
      where: getVisibleRecordsWhere(input?.jobId),
      _sum: { citationsCount: true },
      orderBy: { _sum: { citationsCount: "desc" } },
      take: input?.limit ?? 15,
    })
    .then((domains: CountByRootDomain[]) =>
      domains.map((domain) => ({
        rootDomain: domain.rootDomain,
        count: domain._sum.citationsCount ?? 0,
      })),
    );

export const getLastUpdatedSeries = (prisma: PrismaClient, jobId?: string) =>
  prisma.urlRecord
    .groupBy({
      by: ["lastUpdated"],
      where: getVisibleRecordsWhere(jobId),
      _count: { _all: true },
      orderBy: { lastUpdated: "asc" },
    })
    .then((dates: CountByLastUpdated[]) =>
      dates.map((date) => ({
        date: date.lastUpdated.toISOString().slice(0, 10),
        count: date._count._all,
      })),
    );

export const getRootDomains = (prisma: PrismaClient, jobId?: string) =>
  prisma.urlRecord
    .findMany({
      where: getVisibleRecordsWhere(jobId),
      distinct: ["rootDomain"],
      select: { rootDomain: true },
      orderBy: { rootDomain: "asc" },
    })
    .then((rows: { rootDomain: string }[]) =>
      rows.map((row) => row.rootDomain),
    );

export const getAiModels = (prisma: PrismaClient, jobId?: string) =>
  prisma.urlRecord
    .findMany({
      where: getVisibleRecordsWhere(jobId),
      distinct: ["aiModelMentioned"],
      select: { aiModelMentioned: true },
      orderBy: { aiModelMentioned: "asc" },
    })
    .then((rows: { aiModelMentioned: string }[]) =>
      rows.map((row) => row.aiModelMentioned),
    );

export const getTopPagesByDomain = (
  prisma: PrismaClient,
  input: TopByDomainInput,
) => {
  const where = {
    ...getVisibleRecordsWhere(input.jobId),
    rootDomain: input.rootDomain,
  };

  return prisma.urlRecord
    .groupBy({
      by: ["url", "title"],
      where,
      _sum: { citationsCount: true, mentionsCount: true },
      orderBy: { _sum: { [input.metric]: "desc" } },
      take: input.limit,
    })
    .then((rows: SumByPage[]) =>
      rows.map((row) => ({
        url: row.url,
        title: row.title,
        value: (row._sum[input.metric as keyof typeof row._sum] ?? 0) as number,
      })),
    );
};

export const getTopCategoriesByDomain = (
  prisma: PrismaClient,
  input: TopByDomainInput,
) => {
  const where = {
    ...getVisibleRecordsWhere(input.jobId),
    rootDomain: input.rootDomain,
  };

  return prisma.urlRecord
    .groupBy({
      by: ["queryCategory"],
      where,
      _sum: { citationsCount: true, mentionsCount: true },
      orderBy: { _sum: { [input.metric]: "desc" } },
      take: input.limit,
    })
    .then((rows: SumByCategory[]) =>
      rows.map((row) => ({
        category: row.queryCategory,
        value: (row._sum[input.metric as keyof typeof row._sum] ?? 0) as number,
      })),
    );
};

export const getTopModelsByDomain = (
  prisma: PrismaClient,
  input: TopByDomainInput,
) => {
  const where = {
    ...getVisibleRecordsWhere(input.jobId),
    rootDomain: input.rootDomain,
  };

  return prisma.urlRecord
    .groupBy({
      by: ["aiModelMentioned"],
      where,
      _sum: { citationsCount: true, mentionsCount: true },
      orderBy: { _sum: { [input.metric]: "desc" } },
      take: input.limit,
    })
    .then((rows: SumByModel[]) =>
      rows.map((row) => ({
        model: row.aiModelMentioned,
        value: (row._sum[input.metric as keyof typeof row._sum] ?? 0) as number,
      })),
    );
};

export const getTopCompetitorsByDomain = async (
  prisma: PrismaClient,
  input: TopByDomainInput,
) => {
  const selectedWhere = {
    ...getVisibleRecordsWhere(input.jobId),
    rootDomain: input.rootDomain,
  };

  const competitorRows = await prisma.urlRecord.findMany({
    where: { ...selectedWhere, competitorMentioned: { not: "" } },
    distinct: ["competitorMentioned"],
    select: { competitorMentioned: true },
  });

  const competitors = Array.from(
    new Set(
      competitorRows
        .map((r: { competitorMentioned: string }) =>
          r.competitorMentioned.toLowerCase(),
        )
        .filter(Boolean),
    ),
  );

  const rows = await prisma.urlRecord.groupBy({
    by: ["rootDomain"],
    where: {
      ...getVisibleRecordsWhere(input.jobId),
      OR: [
        { rootDomain: input.rootDomain },
        ...competitors.map((c) => ({
          rootDomain: { contains: c, mode: "insensitive" as const },
        })),
      ],
    },
    _sum: { citationsCount: true, mentionsCount: true },
    orderBy: { _sum: { [input.metric]: "desc" } },
    take: input.limit,
  });

  return (rows as SumByRootDomain[]).map((row) => ({
    name: row.rootDomain,
    value: (row._sum[input.metric as keyof typeof row._sum] ?? 0) as number,
    isSelected: row.rootDomain === input.rootDomain,
  }));
};
