import { useEffect, useState } from "react";
import { trpc } from "../utils/trpc";

type SortBy =
  | "createdAt"
  | "lastUpdated"
  | "rootDomain"
  | "aiModelMentioned"
  | "visibilityScore"
  | "citationsCount"
  | "mentionsCount"
  | "positionInResponse";

type SortDirection = "asc" | "desc";

type ColumnKey =
  | "url"
  | "aiModel"
  | "sentiment"
  | "visibility"
  | "citations"
  | "mentions"
  | "position"
  | "region"
  | "updated";

type TableRow = {
  id: string;
  url: string;
  title: string;
  rootDomain: string;
  aiModelMentioned: string;
  sentiment: string;
  visibilityScore: number;
  citationsCount: number;
  mentionsCount: number;
  positionInResponse: number;
  geographicRegion: string;
  lastUpdated: string | Date;
};

type ColumnDef = {
  key: ColumnKey;
  label: string;
  sortBy?: SortBy;
  headerClass?: string;
  cellClass?: string;
};

const columnDefs: ColumnDef[] = [
  {
    key: "url",
    label: "URL",
    sortBy: "rootDomain",
    headerClass: "w-70",
    cellClass: "w-70 max-w-70 px-2 py-1.5",
  },
  { key: "aiModel", label: "AI Model", sortBy: "aiModelMentioned" },
  { key: "sentiment", label: "Sentiment" },
  { key: "visibility", label: "Visibility", sortBy: "visibilityScore" },
  { key: "citations", label: "Citations", sortBy: "citationsCount" },
  { key: "mentions", label: "Mentions", sortBy: "mentionsCount" },
  {
    key: "position",
    label: "Position",
    sortBy: "positionInResponse",
    cellClass: "whitespace-nowrap px-2 py-1.5 font-mono text-xs text-gray-700",
  },
  { key: "region", label: "Region" },
  { key: "updated", label: "Updated", sortBy: "lastUpdated" },
];

const defaultCellClass = "whitespace-nowrap px-2 py-1.5 text-xs text-gray-700";

const defaultVisible: Record<ColumnKey, boolean> = {
  url: true,
  aiModel: true,
  sentiment: true,
  visibility: true,
  citations: true,
  mentions: false,
  position: true,
  region: false,
  updated: true,
};

const pageSizeOptions = [10, 25, 50];

const formatNumber = (value: number | null | undefined) =>
  value == null ? "—" : new Intl.NumberFormat("en-US").format(value);

const formatDate = (value: string | Date | null) => {
  if (!value) return "—";
  return value.toString().slice(0, 10);
};

const renderCell = (key: ColumnKey, record: TableRow) => {
  switch (key) {
    case "url":
      return (
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt=""
            className="h-5 w-5 rounded-sm border border-gray-200"
            src={`https://www.google.com/s2/favicons?domain=${record.rootDomain}&sz=32`}
          />
          <div className="min-w-0">
            <a
              className="block truncate text-xs text-blue-600 hover:underline"
              href={record.url}
              rel="noreferrer"
              target="_blank"
            >
              {record.title}
            </a>
            <p className="truncate text-[10px] text-gray-500">
              {record.rootDomain}
            </p>
          </div>
        </div>
      );
    case "aiModel":
      return (
        <span className="rounded-full bg-indigo-100/70 px-2 py-0.5 text-[10px] font-medium text-indigo-700">
          {record.aiModelMentioned}
        </span>
      );
    case "sentiment":
      return (
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
          {record.sentiment}
        </span>
      );
    case "visibility":
      return record.visibilityScore;
    case "citations":
      return formatNumber(record.citationsCount);
    case "mentions":
      return formatNumber(record.mentionsCount);
    case "position":
      return `#${record.positionInResponse}`;
    case "region":
      return record.geographicRegion;
    case "updated":
      return formatDate(record.lastUpdated);
  }
};

export const RecordsTable = () => {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState<SortBy>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [visible, setVisible] =
    useState<Record<ColumnKey, boolean>>(defaultVisible);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, pageSize, sortBy, sortDirection]);

  const { data, isLoading } = trpc.csv.listRecords.useQuery({
    page,
    pageSize,
    sortBy,
    sortDirection,
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
  });

  const records = (data?.records ?? []) as TableRow[];
  const totalCount = data?.totalCount ?? 0;
  const pageCount = data?.pageCount ?? 0;

  const toggleSort = (column: SortBy) => {
    if (sortBy === column) {
      setSortDirection((direction) => (direction === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortDirection("desc");
    }
  };

  const toggleColumn = (key: ColumnKey) => {
    setVisible((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const activeColumns = columnDefs.filter((column) => visible[column.key]);

  const rangeStart = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, totalCount);

  return (
    <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
      <div className="flex flex-col gap-2 border-b border-stone-200 px-3 py-2 md:flex-row md:items-center md:justify-between">
        <h2 className="text-[10px] font-semibold uppercase text-gray-600">
          Sources
        </h2>
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <input
            className="rounded-md border border-stone-200 bg-white px-2 py-1 text-xs text-gray-700 placeholder:text-gray-400"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search url, title, domain, model..."
            type="search"
            value={search}
          />
          <details className="relative">
            <summary className="cursor-pointer list-none rounded-md border border-stone-200 bg-white px-2 py-1 text-xs text-gray-700">
              Columns
            </summary>
            <div className="absolute right-0 z-10 mt-1 flex flex-col gap-1 rounded-md border border-stone-200 bg-white p-2 shadow-md">
              {columnDefs.map((column) => (
                <label
                  className="flex cursor-pointer items-center gap-2 whitespace-nowrap text-xs text-gray-700"
                  key={column.key}
                >
                  <input
                    checked={visible[column.key]}
                    onChange={() => toggleColumn(column.key)}
                    type="checkbox"
                  />
                  {column.label}
                </label>
              ))}
            </div>
          </details>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {activeColumns.map((column) => {
                const isSortable = Boolean(column.sortBy);
                const isActive = column.sortBy === sortBy;
                return (
                  <th
                    className={`px-2 py-2 text-left text-[10px] font-medium uppercase text-gray-500 ${
                      column.headerClass ?? ""
                    }`}
                    key={column.key}
                  >
                    {isSortable ? (
                      <button
                        className="flex items-center gap-1 uppercase hover:text-gray-700"
                        onClick={() => toggleSort(column.sortBy!)}
                        type="button"
                      >
                        {column.label}
                        <span className="text-gray-400">
                          {isActive
                            ? sortDirection === "asc"
                              ? "↑"
                              : "↓"
                            : "↕"}
                        </span>
                      </button>
                    ) : (
                      column.label
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {isLoading ? (
              <tr>
                <td
                  className="px-2 py-3 text-xs text-gray-500"
                  colSpan={activeColumns.length}
                >
                  Loading records...
                </td>
              </tr>
            ) : null}
            {!isLoading && !records.length ? (
              <tr>
                <td
                  className="px-2 py-3 text-xs text-gray-500"
                  colSpan={activeColumns.length}
                >
                  {debouncedSearch
                    ? "No records match your search."
                    : "Upload a CSV to populate source rows."}
                </td>
              </tr>
            ) : null}
            {records.map((record) => (
              <tr className="hover:bg-gray-50" key={record.id}>
                {activeColumns.map((column) => (
                  <td
                    className={column.cellClass ?? defaultCellClass}
                    key={column.key}
                  >
                    {renderCell(column.key, record)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-2 border-t border-stone-200 px-3 py-2 md:flex-row md:items-center md:justify-between">
        <div className="text-[11px] text-gray-600">
          {totalCount > 0
            ? `Showing ${rangeStart}–${rangeEnd} of ${formatNumber(totalCount)}`
            : null}
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1 text-[11px] text-gray-600">
            Rows:
            <select
              className="rounded-md border border-stone-200 bg-white px-1.5 py-0.5 text-[11px]"
              onChange={(event) => setPageSize(Number(event.target.value))}
              value={pageSize}
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-center gap-1">
            <button
              className="rounded-md border border-stone-200 px-2 py-0.5 text-[11px] text-gray-700 disabled:cursor-not-allowed disabled:text-gray-300"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              type="button"
            >
              Prev
            </button>
            <span className="text-[11px] text-gray-600">
              {page} / {Math.max(pageCount, 1)}
            </span>
            <button
              className="rounded-md border border-stone-200 px-2 py-0.5 text-[11px] text-gray-700 disabled:cursor-not-allowed disabled:text-gray-300"
              disabled={page >= pageCount}
              onClick={() => setPage((current) => current + 1)}
              type="button"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
