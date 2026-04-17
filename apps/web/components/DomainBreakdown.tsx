import { useState } from "react";
import { trpc } from "../utils/trpc";
import { RankedBarChart } from "./RankedBarChart";

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
  const { data: rootDomains, isLoading: areRootDomainsLoading } =
    trpc.csv.rootDomains.useQuery();

  const [chosenDomain, setChosenDomain] = useState<string | null>(null);
  const [metric, setMetric] = useState<Metric>("citationsCount");

  const effectiveDomain = chosenDomain ?? rootDomains?.[0] ?? null;

  const { data: topPages, isLoading: arePagesLoading } =
    trpc.csv.topPagesByDomain.useQuery(
      {
        rootDomain: effectiveDomain ?? "",
        metric,
        limit: 10,
      },
      { enabled: Boolean(effectiveDomain) },
    );
  const { data: topModels, isLoading: areModelsLoading } =
    trpc.csv.topModelsByDomain.useQuery(
      {
        rootDomain: effectiveDomain ?? "",
        metric,
        limit: 10,
      },
      { enabled: Boolean(effectiveDomain) },
    );

  const pagesData = topPages?.map((page) => ({
    label: truncate(urlPath(page.url)),
    value: page.value,
  }));
  const modelsData = topModels?.map((model) => ({
    label: model.model,
    value: model.value,
  }));

  return (
    <section className="rounded-lg border border-stone-200 bg-white">
      <div className="flex flex-col gap-2 border-b border-stone-200 px-3 py-2 md:flex-row md:items-center md:justify-between">
        <h2 className="text-[10px] font-semibold uppercase text-gray-600">
          Domain breakdown
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

      <div className="grid gap-0 lg:grid-cols-2 lg:divide-x lg:divide-stone-200">
        <div>
          <div className="border-b border-stone-200 px-3 py-2">
            <h3 className="text-[10px] font-semibold uppercase text-gray-600">
              Top pages
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
              Top models
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
      </div>
    </section>
  );
};
