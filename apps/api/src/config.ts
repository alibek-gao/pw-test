const DEFAULT_MAX_CSV_UPLOAD_BYTES = 50 * 1024 * 1024;

const parsePositiveIntegerEnv = (name: string, fallback: number) => {
  const rawValue = process.env[name];

  if (!rawValue) {
    return fallback;
  }

  const parsedValue = Number(rawValue);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw new Error(`${name} must be a positive integer number of bytes.`);
  }

  return parsedValue;
};

export const expectedUrlCsvHeaders = [
  "url",
  "title",
  "ai_model_mentioned",
  "citations_count",
  "sentiment",
  "visibility_score",
  "competitor_mentioned",
  "query_category",
  "last_updated",
  "traffic_estimate",
  "domain_authority",
  "mentions_count",
  "position_in_response",
  "response_type",
  "geographic_region",
] as const;

export const uploadConfig = {
  maxCsvUploadBytes: parsePositiveIntegerEnv(
    "MAX_CSV_UPLOAD_BYTES",
    DEFAULT_MAX_CSV_UPLOAD_BYTES,
  ),
  expectedHeaders: expectedUrlCsvHeaders,
};
