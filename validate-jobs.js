#!/usr/bin/env node

/**
 * Manual deep validator — full GET requests, parses page body for
 * "no longer available" keywords.  Works with any CIF, single URL, or file.
 *
 * Usage:
 *   node validate-jobs.js <CIF>              # validate all jobs for CIF (deep)
 *   node validate-jobs.js <CIF> --delete     # also delete expired
 *   node validate-jobs.js url <url>          # validate single URL
 */

import fs from "fs";
import { querySOLR, deleteJobByUrl } from "./solr.js";
import { validateByHead, validateByContent } from "./src/job-validator.js";

const CIF = process.argv[2];
const DELETE = process.argv.includes("--delete");
const URL = process.argv[3] === "url" ? process.argv[4] : null;

async function validateSingleUrl(url) {
  const head = await validateByHead(url);
  if (!head.ok && head.status === 404) {
    console.log(`❌ EXPIRED (404): ${url}`);
    return { url, status: 404, expired: true };
  }
  const content = await validateByContent(url);
  if (content.expired) {
    console.log(`❌ EXPIRED (keyword): ${url}`);
    return { url, status: content.status, expired: true };
  }
  console.log(`✅ ACTIVE (${head.status}): ${url}`);
  return { url, status: head.status, expired: false };
}

async function main() {
  if (URL) {
    const result = await validateSingleUrl(URL);
    if (result.expired && DELETE) {
      await deleteJobByUrl(URL);
      console.log(`Deleted from SOLR: ${URL}`);
    }
    return;
  }

  if (!CIF || CIF === "url") {
    console.error("Usage: node validate-jobs.js <CIF> [--delete]");
    process.exit(1);
  }

  const result = await querySOLR(`cif:${CIF}`, { rows: 1000 });
  const jobs = result.docs;
  console.log(`Found ${jobs.length} jobs for CIF ${CIF}\n`);

  let active = 0;
  let expired = 0;

  for (const job of jobs) {
    const r = await validateSingleUrl(job.url);
    if (r.expired) {
      expired++;
      if (DELETE) {
        await deleteJobByUrl(job.url);
        console.log(`  Deleted from SOLR`);
      }
    } else {
      active++;
    }
    await new Promise((r) => setTimeout(r, 300));
  }

  console.log(`\n--- Results ---`);
  console.log(`Active: ${active}`);
  console.log(`Expired: ${expired}`);
  console.log(`Total: ${jobs.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
