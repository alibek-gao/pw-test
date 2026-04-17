# Current Implementation

This project implements a CSV upload and AI visibility dashboard on top of the provided Promptwatch monorepo. The solution is split across the Next.js frontend, Fastify API, tRPC router, and Prisma database package.

## Architecture

- `apps/web` contains the Next.js dashboard UI.
- `apps/api` contains the Fastify server, tRPC router, CSV parsing, upload handling, and query services.
- `apps/api/src/routes/csvUpload.ts` registers the `POST /uploads/csv` route and maps upload/cancellation errors to HTTP responses.
- `packages/database` contains the Prisma schema, generated client, and database connection.
- `urls.csv` is the sample CSV used by the parser tests and local manual testing.

The current design uses Fastify multipart handling for the actual file upload with a streaming CSV parser, then uses tRPC for the typed dashboard reads: import jobs, records, summaries, domain counts, last-updated series, and import errors.

## Database Model

The Prisma schema adds three assignment-specific models:

- `ImportJob` tracks each uploaded file, its status, row counts, timestamps, and any fatal error message.
- `UrlRecord` stores valid parsed CSV rows, including URL metadata, derived hostname/root domain, AI model, sentiment, visibility score, citations, mentions, response type, region, and `lastUpdated`.
- `ImportError` stores row-level validation failures with the row number, message, and raw row payload.

`ImportJob` owns both records and errors with cascading deletes. The records table is indexed by fields used for dashboard filtering and aggregation: import job, root domain, `lastUpdated`, AI model, sentiment, and region.

The original starter `User` model is still present but is not part of the CSV workflow.

## CSV Parsing and Validation

CSV parsing lives in `apps/api/src/csv/urlCsv.ts`.

The parser:

- Reads CSV content with `csv-parse`.
- Supports BOMs, trimmed values, quoted commas, and skipped empty lines.
- Validates that the header row exactly matches the expected `urls.csv` schema.
- Validates headers as soon as the first parsed row is available.
- Aborts the upload stream immediately when headers are invalid.
- Requires all text fields needed by the dashboard.
- Parses numeric fields as integers.
- Validates `last_updated` as `YYYY-MM-DD`.
- Validates each URL as an absolute URL.
- Derives `hostname` and `rootDomain` using `tldts`.
- Returns valid records and invalid rows separately.

This split lets an import partially succeed. Good rows are saved, bad rows are preserved as `ImportError` records, and the job status becomes `COMPLETED_WITH_ERRORS`.

There are two parser entry points:

- `parseUrlCsvContent` parses a complete string and is useful for tests and small in-memory inputs.
- `parseUrlCsvStream` parses a `Readable` stream, validates the first row before continuing, and calls record/error handlers as rows arrive.

Current validation is intentionally focused on structural correctness. A next pass should tighten domain rules, such as rejecting negative counts, enforcing score ranges, and detecting impossible calendar dates after JavaScript date normalization.

## Upload Flow

The frontend upload form lives in `apps/web/components/CsvUploader.tsx` and is embedded in the dashboard header.

The current flow is:

1. The user selects a `.csv` file.
2. The frontend validates the extension and checks the configured upload size limit.
3. The frontend sends the file as `multipart/form-data` to `POST /uploads/csv`.
4. Fastify validates that the uploaded file looks like CSV and enforces the same size limit.
5. The API passes the upload stream to `importUrlCsvStream`.
6. `importUrlCsvStream` creates an `ImportJob`, parses the file as a stream, writes valid rows in batches, writes row errors in batches, and marks the job as completed or completed with errors.
7. The frontend invalidates tRPC dashboard queries so the latest import appears immediately.

If the client aborts the request, the upload route now signals cancellation to the importer. The importer destroys the upload stream, cleans up already-written records/errors, and marks the import job as `FAILED`.

## Why Multipart Upload Instead of tRPC Upload

The assignment asks for tRPC integration, and the dashboard reads are already implemented through tRPC. The upload itself currently uses a Fastify multipart route because files are binary request bodies and multipart handling is the standard HTTP path for real file uploads.

This has a few practical benefits:

- The browser can send the selected `File` directly without converting the whole CSV to JSON.
- Fastify can enforce file size limits at the upload layer.
- The API can parse the upload stream without buffering the whole file.
- Invalid headers can stop parsing before the rest of the CSV is consumed.
- Client disconnects can cancel the parser and trigger cleanup.
- It leaves room for real upload progress support.

A tRPC mutation for this assignment would also be reasonable. It would likely accept `{ fileName, content }`, where the frontend reads the file with `file.text()`. That approach would better satisfy a strict reading of "Build a tRPC endpoint to handle CSV content" and would reuse the same `importUrlCsv` service.

The tradeoff is that a normal tRPC mutation is not true file streaming. It serializes the CSV as JSON input, so both the client and server handle the full CSV content at once. For the provided `urls.csv` and an assignment-sized file, that is fine. For larger files, multipart upload remains the more production-oriented choice.

## tRPC API

The CSV tRPC router lives in `apps/api/src/routers/csv.ts`.

It exposes:

- `config` for upload settings and expected headers.
- `listJobs` for recent import jobs.
- `jobStatus` for a single import job.
- `listRecords` for paginated, sorted, filtered URL records.
- `summary` for top-level dashboard metrics.
- `domainCounts` for domain occurrence chart data.
- `lastUpdatedSeries` for line chart data based on `last_updated`.
- `rootDomains` for the full alphabetical list of distinct root domains used by the domain breakdown selector.
- `topPagesByDomain` for the top pages within a selected domain, ranked by either citations or mentions.
- `topModelsByDomain` for the top AI models within a selected domain, ranked by either citations or mentions.
- `importErrors` for paginated row-level import errors.

The query services only expose records from completed or partially completed imports. Failed imports are excluded from dashboard reads so partial cleanup or fatal parser failures do not pollute the visible dataset.

## Failure and Cleanup Strategy

The importer deliberately does not hold one database transaction open for the full file transfer. Long-running transactions are a poor fit for large uploads because they can hold locks, increase contention, and fail after a lot of work has already happened.

Instead, the current strategy is:

1. Create an `ImportJob` in `PROCESSING` state.
2. Stream and validate the CSV row by row.
3. Persist records and row errors in bounded batches.
4. Keep `PROCESSING` imports hidden from dashboard reads.
5. On success, mark the job `COMPLETED` or `COMPLETED_WITH_ERRORS`.
6. On parse errors, database errors, stream errors, or client cancellation, run cleanup in a database transaction:
   - delete records for that import job
   - delete row errors for that import job
   - mark the import job `FAILED`
   - store the failure message

This gives atomic failure cleanup without the operational cost of wrapping the entire upload in a single transaction. It still does not provide resumability; cancelled or failed uploads must be retried from the beginning.

## Frontend Dashboard

The dashboard is composed of focused components under `apps/web/components`:

- `CsvUploader` owns the upload form, client-side validation, progress state, and tRPC cache invalidation on success.
- `DomainCountsChart` and `LastUpdatedSeriesChart` render the two assignment-required charts.
- `DomainBreakdown` wires a root domain selector and a citations/mentions toggle to two `RankedBarChart` instances for top pages and top models.
- `RankedBarChart` is a reusable horizontal bar chart used by the domain breakdown.

The page itself currently includes:

- CSV file picker and upload button with file extension and size validation.
- Upload success and error states surfaced in the uploader card.
- Summary metrics for records, domains, average visibility, citations, mentions, and date range.
- Horizontal bar chart of top root domains by record count.
- Line chart of records per day based on `last_updated`.
- Domain breakdown section: a native select with alphabetical root domains, a citations/mentions toggle, a top-pages chart, and a top-models chart.
- Recent import jobs with status and row/error counts.
- Paginated records table with external links and favicons based on each record's root domain.

## Testing and Verification

Current parser tests cover:

- Parsing the provided `urls.csv`.
- Deriving hostname and root domain.
- Header validation.
- Invalid row values.
- Quoted commas.
- Streaming parser behavior.
- Early abort on invalid headers.

The current project state has been verified with:

```bash
pnpm --filter @repo/api test
pnpm --filter @repo/api lint
pnpm --filter web lint
pnpm --filter web build
pnpm --filter @repo/database lint
pnpm --filter @repo/database build
```

All of the above pass in the current local state.

## Known Gaps

- Upload currently uses a Fastify route rather than a tRPC mutation.
- Import errors are stored but not exposed in the UI.
- The records table filter controls (domain, AI model, sentiment, region) are supported by the API but not yet surfaced in the UI.
- CSV validation should enforce stricter numeric ranges and real calendar dates.
- The current streaming importer is sufficient for this assignment, but production-scale imports could still add resumability and background cleanup for process-level crashes.
- Root README still contains some starter inconsistencies, such as references to `domains.csv` and `prisma/schema/main.prisma`.
- `apps/web/README.md` is currently empty from an existing worktree change.
- The starter `User` model and seed data remain in the database package.

## Recommended Next Work

1. Decide whether to migrate upload to a simple tRPC mutation for assignment alignment or keep multipart upload and document it as an intentional production-style choice.
2. Add an import error panel for jobs with failed rows.
3. Surface the existing filter controls on the records table.
4. Tighten parser validation and add tests for the new edge cases.
5. Clean up README inaccuracies and remove unused starter code if the final submission should be focused.
