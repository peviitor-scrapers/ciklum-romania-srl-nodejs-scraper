/**
 * Ciklum-Specific Job URL Validator (Chromium-based, used by CI)
 *
 * Oracle HCM SPA returns HTTP 200 for ALL pages — even expired ones.
 * The "expired" message is rendered client-side by JavaScript.
 * HEAD requests are useless; we must render with Chromium and check the DOM.
 *
 * Flags:
 *   --dry-run    Show invalid jobs but do not delete
 *   --delete     Delete invalid jobs from SOLR after listing
 */
import companyConfig from "../config/company.js";
import { querySOLR, deleteJobByUrl } from "../solr.js";
import { validateByChromium } from "../src/job-validator.js";

const CIF = companyConfig.cif;
const COMPANY = companyConfig.legalName;

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const doDelete = process.argv.includes("--delete");

  if (!process.env.SOLR_AUTH) {
    console.log("SOLR_AUTH not set — skipping validation");
    process.exit(0);
  }

  console.log(`=== Validating ${COMPANY} (CIF: ${CIF}) ===`);
  console.log(`Method: Chromium headless (SPA-aware)\n`);

  const result = await querySOLR(CIF);
  console.log(`Total jobs in SOLR: ${result.numFound}`);

  if (result.numFound === 0) {
    console.log("No jobs to validate.");
    return;
  }

  const invalid = [];
  for (const job of result.docs) {
    const check = await validateByChromium(job.url);
    const icon = check.status === "active" ? "✅" : check.status === "expired" ? "❌" : "⚠️";
    console.log(`${icon} [${check.status}] ${job.title}`);
    if (check.status !== "active") invalid.push(job);
  }

  if (invalid.length === 0) {
    console.log("\n✅ All jobs valid");
    return;
  }

  console.log(`\n⚠️ ${invalid.length} invalid jobs found`);
  if (dryRun) {
    console.log("(dry run — no deletions performed)");
    return;
  }
  if (doDelete) {
    for (const job of invalid) {
      await deleteJobByUrl(job.url);
      console.log(`Deleted: ${job.title}`);
    }
    console.log(`\n✅ Deleted ${invalid.length} expired jobs from SOLR`);
  }
}

main().catch(err => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
