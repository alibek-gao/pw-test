import { useState } from "react";
import { DelayedLoadingText } from "./DelayedLoadingText";
import { trpc } from "../utils/trpc";
import { RankedBarChart } from "./RankedBarChart";

const formatDateRange = (from: string | null, to: string | null) => {
  if (!from) return "No data";
  const f = from.slice(0, 10);
  const t = (to ?? from).slice(0, 10);
  return f.slice(0, 4) === t.slice(0, 4)
    ? `${f} to ${t.slice(5)}`
    : `${f} to ${t}`;
};

const formatNumber = (value: number | null | undefined) =>
  value == null ? "No data" : new Intl.NumberFormat("en-US").format(value);

type Metric = "citationsCount" | "mentionsCount";

const metricLabel: Record<Metric, string> = {
  citationsCount: "Citations",
  mentionsCount: "Mentions",
};

const truncate = (value: string, max = 40) =>
  value.length > max ? `${value.slice(0, max - 1)}…` : value;

const urlPath = (url: string) => {
  try {
    return new URL(url).pathname || "/";
  } catch {
    return url;
  }
};

export const DomainBreakdown = () => {
  const {
    data: rootDomains,
    isFetching: areRootDomainsFetching,
    isLoading: areRootDomainsLoading,
  } = trpc.csv.rootDomains.useQuery();

  const [chosenDomain, setChosenDomain] = useState<string | null>(null);
  const [metric, setMetric] = useState<Metric>("citationsCount");

  const effectiveDomain = chosenDomain ?? rootDomains?.[0] ?? null;

  const {
    data: summary,
    isFetching: isSummaryFetching,
    isLoading: isSummaryLoading,
  } = trpc.csv.summary.useQuery(
    { rootDomain: effectiveDomain ?? "" },
    { enabled: Boolean(effectiveDomain), keepPreviousData: true },
  );

  const {
    data: topPages,
    isFetching: arePagesFetching,
    isLoading: arePagesLoading,
  } = trpc.csv.topPagesByDomain.useQuery(
    {
      rootDomain: effectiveDomain ?? "",
      metric,
      limit: 10,
    },
    { enabled: Boolean(effectiveDomain), keepPreviousData: true },
  );
  const {
    data: topModels,
    isFetching: areModelsFetching,
    isLoading: areModelsLoading,
  } = trpc.csv.topModelsByDomain.useQuery(
    {
      rootDomain: effectiveDomain ?? "",
      metric,
      limit: 10,
    },
    { enabled: Boolean(effectiveDomain), keepPreviousData: true },
  );
  const {
    data: topCategories,
    isFetching: areCategoriesFetching,
    isLoading: areCategoriesLoading,
  } = trpc.csv.topCategoriesByDomain.useQuery(
    {
      rootDomain: effectiveDomain ?? "",
      metric,
      limit: 10,
    },
    { enabled: Boolean(effectiveDomain), keepPreviousData: true },
  );

  const {
    data: topCompetitors,
    isFetching: areCompetitorsFetching,
    isLoading: areCompetitorsLoading,
  } = trpc.csv.topCompetitorsByDomain.useQuery(
    {
      rootDomain: effectiveDomain ?? "",
      metric,
      limit: 10,
    },
    { enabled: Boolean(effectiveDomain), keepPreviousData: true },
  );

  const pagesData = topPages?.map((page) => ({
    label: truncate(urlPath(page.url)),
    value: page.value,
  }));
  const modelsData = topModels?.map((model) => ({
    label: model.model,
    value: model.value,
  }));
  const categoriesData = topCategories?.map((cat) => ({
    label: truncate(cat.category),
    value: cat.value,
  }));
  const competitorsData = topCompetitors?.map((c) => ({
    label: c.name,
    value: c.value,
    fill: c.isSelected ? "#4f46e5" : "#d1d5db",
  }));
  const hasRootDomainsData = rootDomains !== undefined;
  const hasPagesData = topPages !== undefined;
  const hasModelsData = topModels !== undefined;
  const hasCategoriesData = topCategories !== undefined;
  const hasCompetitorsData = topCompetitors !== undefined;

  return (
    <section className="rounded-lg border border-stone-200 bg-white">
      <div className="flex flex-col gap-2 border-b border-stone-200 px-3 py-2 md:flex-row md:items-center md:justify-between">
        <h2 className="text-[10px] font-semibold uppercase text-gray-600">
          Domain breakdown
          <DelayedLoadingText
            hasData={hasRootDomainsData}
            isLoading={areRootDomainsFetching}
          />
        </h2>

        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <select
            className="max-w-full rounded-md border border-stone-200 bg-white px-2 py-1 text-xs text-gray-700 disabled:text-gray-400"
            disabled={areRootDomainsLoading || !rootDomains?.length}
            onChange={(event) => setChosenDomain(event.target.value)}
            value={effectiveDomain ?? ""}
          >
            {areRootDomainsLoading ? (
              <option value="">Loading domains...</option>
            ) : null}
            {!areRootDomainsLoading && !rootDomains?.length ? (
              <option value="">No domains yet</option>
            ) : null}
            {rootDomains?.map((domain) => (
              <option key={domain} value={domain}>
                {domain}
              </option>
            ))}
          </select>

          <div className="inline-flex overflow-hidden rounded-md border border-stone-200">
            {(Object.keys(metricLabel) as Metric[]).map((option) => (
              <button
                className={`px-3 py-1 text-xs font-medium ${
                  metric === option
                    ? "bg-gray-900 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
                key={option}
                onClick={() => setMetric(option)}
                type="button"
              >
                {metricLabel[option]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 divide-x divide-stone-200 border-b border-stone-200 md:grid-cols-5">
        {[
          ["Records", formatNumber(summary?.totalRecords)],
          [
            "Visibility",
            summary?.averageVisibilityScore == null
              ? "No data"
              : summary.averageVisibilityScore.toFixed(1),
          ],
          ["Citations", formatNumber(summary?.totalCitations)],
          ["Mentions", formatNumber(summary?.totalMentions)],
          [
            "Date Range",
            formatDateRange(
              summary?.dateRange.from ?? null,
              summary?.dateRange.to ?? null,
            ),
          ],
        ].map(([label, value]) => (
          <div className="px-3 py-2" key={label}>
            <p className="text-[10px] font-semibold uppercase text-gray-500">
              {label}
              <DelayedLoadingText
                hasData={summary !== undefined}
                isLoading={isSummaryFetching}
              />
            </p>
            <p className="mt-0.5 truncate text-sm font-semibold text-gray-900">
              {isSummaryLoading && summary === undefined ? "Loading..." : value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-0 divide-stone-200 lg:grid-cols-2 lg:divide-x">
        <div className="divide-y divide-stone-200">
          <div>
            <div className="border-b border-stone-200 px-3 py-2">
              <h3 className="text-[10px] font-semibold uppercase text-gray-600">
                Top pages
                <DelayedLoadingText
                  hasData={hasPagesData}
                  isLoading={arePagesFetching}
                />
              </h3>
            </div>
            <RankedBarChart
              data={pagesData}
              emptyText="No pages for this domain."
              isLoading={arePagesLoading && Boolean(effectiveDomain)}
              labelWidth={180}
              loadingText="Loading pages..."
              valueLabel={metricLabel[metric]}
            />
          </div>
          <div>
            <div className="border-b border-stone-200 px-3 py-2">
              <h3 className="text-[10px] font-semibold uppercase text-gray-600">
                Top categories
                <DelayedLoadingText
                  hasData={hasCategoriesData}
                  isLoading={areCategoriesFetching}
                />
              </h3>
            </div>
            <RankedBarChart
              data={categoriesData}
              emptyText="No categories for this domain."
              isLoading={areCategoriesLoading && Boolean(effectiveDomain)}
              labelWidth={120}
              loadingText="Loading categories..."
              valueLabel={metricLabel[metric]}
            />
          </div>
        </div>
        <div className="divide-y divide-stone-200">
          <div>
            <div className="border-b border-stone-200 px-3 py-2">
              <h3 className="text-[10px] font-semibold uppercase text-gray-600">
                Top models
                <DelayedLoadingText
                  hasData={hasModelsData}
                  isLoading={areModelsFetching}
                />
              </h3>
            </div>
            <RankedBarChart
              data={modelsData}
              emptyText="No models for this domain."
              isLoading={areModelsLoading && Boolean(effectiveDomain)}
              labelWidth={100}
              loadingText="Loading models..."
              valueLabel={metricLabel[metric]}
            />
          </div>
          <div>
            <div className="border-b border-stone-200 px-3 py-2">
              <h3 className="text-[10px] font-semibold uppercase text-gray-600">
                Top competitors
                <DelayedLoadingText
                  hasData={hasCompetitorsData}
                  isLoading={areCompetitorsFetching}
                />
              </h3>
            </div>
            <RankedBarChart
              data={competitorsData}
              emptyText="No competitors found for this domain."
              isLoading={areCompetitorsLoading && Boolean(effectiveDomain)}
              labelWidth={140}
              loadingText="Loading competitors..."
              valueLabel={metricLabel[metric]}
            />
          </div>
        </div>
      </div>
    </section>
  );
};
