import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import {
  parseUrlCsvContent,
  validateUrlCsvHeaders,
} from "./urlCsv.js";

const urlsCsvPath = resolve(process.cwd(), "../../urls.csv");

test("parseUrlCsvContent parses the provided urls.csv", () => {
  const parsed = parseUrlCsvContent(readFileSync(urlsCsvPath, "utf8"));

  assert.equal(parsed.records.length, 111);
  assert.equal(parsed.errors.length, 0);
  assert.equal(parsed.records[0]?.rootDomain, "hubspot.com");
});

test("parseUrlCsvContent derives hostname and root domain", () => {
  const parsed = parseUrlCsvContent(readFileSync(urlsCsvPath, "utf8"));
  const shopifyRecord = parsed.records.find((record) =>
    record.url.includes("shopify.com/pricing"),
  );

  assert.ok(shopifyRecord);
  assert.equal(shopifyRecord.hostname, "www.shopify.com");
  assert.equal(shopifyRecord.rootDomain, "shopify.com");
});

test("validateUrlCsvHeaders reports missing and misplaced headers", () => {
  const errors = validateUrlCsvHeaders(["url", "wrong_header"]);

  assert.match(errors.join(" "), /Expected 15 columns/);
  assert.match(errors.join(" "), /Column 2 must be "title"/);
});

test("parseUrlCsvContent returns a header error for invalid headers", () => {
  const parsed = parseUrlCsvContent("url,title\nhttps://example.com,Example");

  assert.equal(parsed.records.length, 0);
  assert.equal(parsed.errors.length, 1);
  assert.equal(parsed.errors[0]?.rowNumber, 1);
  assert.match(parsed.errors[0]?.message ?? "", /Expected 15 columns/);
});

test("parseUrlCsvContent returns row errors for invalid row values", () => {
  const csv = [
    "url,title,ai_model_mentioned,citations_count,sentiment,visibility_score,competitor_mentioned,query_category,last_updated,traffic_estimate,domain_authority,mentions_count,position_in_response,response_type,geographic_region",
    "not-a-url,Example,ChatGPT,nope,positive,85,Competitor,category,2024-12-15,1000,90,10,1,response,global",
  ].join("\n");
  const parsed = parseUrlCsvContent(csv);

  assert.equal(parsed.records.length, 0);
  assert.equal(parsed.errors.length, 1);
  assert.equal(parsed.errors[0]?.rowNumber, 2);
  assert.match(parsed.errors[0]?.message ?? "", /url must be a valid/);
  assert.match(parsed.errors[0]?.message ?? "", /citations_count must be an integer/);
});

test("parseUrlCsvContent handles quoted commas", () => {
  const csv = [
    "url,title,ai_model_mentioned,citations_count,sentiment,visibility_score,competitor_mentioned,query_category,last_updated,traffic_estimate,domain_authority,mentions_count,position_in_response,response_type,geographic_region",
    'https://example.com/path,"Title, with comma",ChatGPT,12,positive,80,Competitor,category,2024-12-15,1000,90,10,1,response,global',
  ].join("\n");
  const parsed = parseUrlCsvContent(csv);

  assert.equal(parsed.errors.length, 0);
  assert.equal(parsed.records.length, 1);
  assert.equal(parsed.records[0]?.title, "Title, with comma");
  assert.equal(parsed.records[0]?.rootDomain, "example.com");
});
