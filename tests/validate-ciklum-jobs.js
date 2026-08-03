/**
 * Ciklum-Specific Job URL Validator (used by CI)
 *
 * Fast nightly path: HEAD requests only (validateByHead). Oracle HCM returns
 * HTTP 200 for many expired pages, so for the SPA-aware deep validation
 * (job-deep-validate.yml) pass --browser to render each page with headless
 * Chromium (Playwright) and scan the DOM for "no longer available" keywords.
 *
 * Flags:
 *   --dry-run            Show invalid jobs but do not delete
 *   --delete             Delete invalid jobs via the Peviitor API
 *   --browser            Render pages with headless Chromium (Playwright)
 *   --timeout <ms>       Per-page timeout (browser mode, default 30000)
 */
import { querySOLR, deleteJobByUrl } from "../scraper/api.js";
import {
  validateByHead,
  validateByContent,
  DEFAULT_EXPIRED_KEYWORDS
} from "../scraper/job-validator.js";
import companyConfig from "../scraper/config/company.js";

const CIF = companyConfig.id;
const COMPANY = companyConfig.company;

async function validateByBrowser(url, timeoutMs) {
  try {
    const { chromium } = await import("playwright");
    const browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });
    try {
      const page = await browser.newPage();
      const resp = await page.goto(url, {
        timeout: timeoutMs,
        waitUntil: "networkidle"
      });
      await page.waitForTimeout(2000);
      const text = await page.evaluate(() => document.body.innerText || "");
      const lower = text.toLowerCase();
      const expired = DEFAULT_EXPIRED_KEYWORDS.some(kw => lower.includes(kw));
      return {
        url,
        status: expired ? "expired" : "active",
        httpStatus: resp ? resp.status() : 0,
        title: null,
        error: null
      };
    } finally {
      await browser.close();
    }
  } catch (err) {
    return { url, status: "error", httpStatus: 0, title: null, error: err.message };
  }
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const doDelete = process.argv.includes("--delete");
  const browserMode = process.argv.includes("--browser");

  const timeoutIdx = process.argv.indexOf("--timeout");
  const timeoutMs = timeoutIdx !== -1
    ? Number(process.argv[timeoutIdx + 1]) || 30000
    : 30000;

  console.log(`=== Validating ${COMPANY} (CIF: ${CIF}) ===`);
  console.log(`Method: ${browserMode ? "Chromium headless (SPA-aware)" : "HEAD requests (fast)"}\n`);

  const result = await querySOLR(CIF);
  console.log(`Total jobs in API: ${result.numFound}`);

  if (result.numFound === 0) {
    console.log("No jobs to validate.");
    return;
  }

  const invalid = [];
  for (let i = 0; i < result.docs.length; i++) {
    const job = result.docs[i];
    const check = browserMode
      ? await validateByBrowser(job.url, timeoutMs)
      : await validateByHead(job.url);

    const icon = check.status === "active" ? "✅" : check.status === "expired" ? "❌" : "⚠️";
    console.log(`${icon} [${i + 1}/${result.docs.length}] ${check.status} (HTTP ${check.httpStatus}) - ${job.url}`);
    if (check.error) {
      console.log(`   Error: ${check.error}`);
    }
    if (check.status !== "active") {
      invalid.push({ ...job, check });
    }
  }

  if (invalid.length === 0) {
    console.log("\n✅ All jobs valid");
    return;
  }

  console.log(`\n⚠️ ${invalid.length} invalid jobs found:`);
  for (const job of invalid) {
    console.log(`   - ${job.title}: ${job.check.status} (${job.url})`);
  }

  if (dryRun) {
    console.log("(dry run — no deletions performed)");
    return;
  }

  if (!doDelete) {
    console.log("\nPass --delete to remove invalid jobs");
    return;
  }

  for (const job of invalid) {
    console.log(`Deleting: ${job.title}`);
    await deleteJobByUrl(job.url);
  }
  console.log(`\n✅ Deleted ${invalid.length} invalid jobs via API`);
}

main().catch(err => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
