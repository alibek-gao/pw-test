import { parse } from "csv-parse/sync";
import { getDomain, getHostname } from "tldts";
import { expectedUrlCsvHeaders } from "../config.js";

type UrlCsvHeader = (typeof expectedUrlCsvHeaders)[number];

type RawUrlCsvRow = Record<UrlCsvHeader, string>;

export type ParsedUrlCsvRecord = {
  url: string;
  hostname: string;
  rootDomain: string;
  title: string;
  aiModelMentioned: string;
  citationsCount: number;
  sentiment: string;
  visibilityScore: number;
  competitorMentioned: string;
  queryCategory: string;
  lastUpdated: Date;
  trafficEstimate: number;
  domainAuthority: number;
  mentionsCount: number;
  positionInResponse: number;
  responseType: string;
  geographicRegion: string;
};

export type UrlCsvRowError = {
  rowNumber: number;
  message: string;
  rawRow?: unknown;
};

export type ParsedUrlCsv = {
  records: ParsedUrlCsvRecord[];
  errors: UrlCsvRowError[];
};

const numberFields = [
  "citations_count",
  "visibility_score",
  "traffic_estimate",
  "domain_authority",
  "mentions_count",
  "position_in_response",
] as const satisfies readonly UrlCsvHeader[];

const requiredTextFields = [
  "url",
  "title",
  "ai_model_mentioned",
  "sentiment",
  "competitor_mentioned",
  "query_category",
  "last_updated",
  "response_type",
  "geographic_region",
] as const satisfies readonly UrlCsvHeader[];

export const validateUrlCsvHeaders = (headers: string[]) => {
  const expectedHeaders = [...expectedUrlCsvHeaders];
  const errors: string[] = [];

  if (headers.length !== expectedHeaders.length) {
    errors.push(
      `Expected ${expectedHeaders.length} columns, received ${headers.length}.`,
    );
  }

  expectedHeaders.forEach((expectedHeader, index) => {
    if (headers[index] !== expectedHeader) {
      errors.push(
        `Column ${index + 1} must be "${expectedHeader}", received "${
          headers[index] ?? "missing"
        }".`,
      );
    }
  });

  return errors;
};

const parseRequiredText = (
  row: RawUrlCsvRow,
  field: (typeof requiredTextFields)[number],
  errors: string[],
) => {
  const value = row[field]?.trim();

  if (!value) {
    errors.push(`${field} is required.`);
    return "";
  }

  return value;
};

const parseInteger = (
  row: RawUrlCsvRow,
  field: (typeof numberFields)[number],
  errors: string[],
) => {
  const value = row[field]?.trim();
  const parsedValue = Number(value);

  if (!value || !Number.isInteger(parsedValue)) {
    errors.push(`${field} must be an integer.`);
    return 0;
  }

  return parsedValue;
};

const parseLastUpdated = (value: string, errors: string[]) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    errors.push("last_updated must use YYYY-MM-DD format.");
    return new Date(0);
  }

  const parsedDate = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(parsedDate.getTime())) {
    errors.push("last_updated must be a valid date.");
  }

  return parsedDate;
};

const getUrlParts = (url: string, errors: string[]) => {
  try {
    new URL(url);
  } catch {
    errors.push("url must be a valid absolute URL.");
  }

  const hostname = getHostname(url);

  if (!hostname) {
    errors.push("url must include a valid hostname.");
    return { hostname: "", rootDomain: "" };
  }

  return {
    hostname,
    rootDomain: getDomain(url, { allowPrivateDomains: true }) ?? hostname,
  };
};

export const parseUrlCsvRow = (
  row: RawUrlCsvRow,
  rowNumber: number,
): { record?: ParsedUrlCsvRecord; error?: UrlCsvRowError } => {
  const errors: string[] = [];

  const url = parseRequiredText(row, "url", errors);
  const title = parseRequiredText(row, "title", errors);
  const aiModelMentioned = parseRequiredText(row, "ai_model_mentioned", errors);
  const sentiment = parseRequiredText(row, "sentiment", errors);
  const competitorMentioned = parseRequiredText(
    row,
    "competitor_mentioned",
    errors,
  );
  const queryCategory = parseRequiredText(row, "query_category", errors);
  const lastUpdatedValue = parseRequiredText(row, "last_updated", errors);
  const responseType = parseRequiredText(row, "response_type", errors);
  const geographicRegion = parseRequiredText(row, "geographic_region", errors);
  const citationsCount = parseInteger(row, "citations_count", errors);
  const visibilityScore = parseInteger(row, "visibility_score", errors);
  const trafficEstimate = parseInteger(row, "traffic_estimate", errors);
  const domainAuthority = parseInteger(row, "domain_authority", errors);
  const mentionsCount = parseInteger(row, "mentions_count", errors);
  const positionInResponse = parseInteger(row, "position_in_response", errors);
  const { hostname, rootDomain } = getUrlParts(url, errors);
  const lastUpdated = parseLastUpdated(lastUpdatedValue, errors);

  if (errors.length > 0) {
    return {
      error: {
        rowNumber,
        message: errors.join(" "),
        rawRow: row,
      },
    };
  }

  return {
    record: {
      url,
      hostname,
      rootDomain,
      title,
      aiModelMentioned,
      citationsCount,
      sentiment,
      visibilityScore,
      competitorMentioned,
      queryCategory,
      lastUpdated,
      trafficEstimate,
      domainAuthority,
      mentionsCount,
      positionInResponse,
      responseType,
      geographicRegion,
    },
  };
};

export const parseUrlCsvContent = (content: string): ParsedUrlCsv => {
  const rows = parse(content, {
    bom: true,
    relaxColumnCount: true,
    skipEmptyLines: true,
    trim: true,
  }) as string[][];

  if (rows.length === 0) {
    return {
      records: [],
      errors: [{ rowNumber: 1, message: "CSV file is empty." }],
    };
  }

  const [headers, ...dataRows] = rows;
  const headerErrors = validateUrlCsvHeaders(headers);

  if (headerErrors.length > 0) {
    return {
      records: [],
      errors: [
        {
          rowNumber: 1,
          message: headerErrors.join(" "),
          rawRow: headers,
        },
      ],
    };
  }

  return dataRows.reduce<ParsedUrlCsv>(
    (result, dataRow, index) => {
      const rawRow = Object.fromEntries(
        expectedUrlCsvHeaders.map((header, headerIndex) => [
          header,
          dataRow[headerIndex] ?? "",
        ]),
      ) as RawUrlCsvRow;
      const parsed = parseUrlCsvRow(rawRow, index + 2);

      if (parsed.record) {
        result.records.push(parsed.record);
      }

      if (parsed.error) {
        result.errors.push(parsed.error);
      }

      return result;
    },
    { records: [], errors: [] },
  );
};
