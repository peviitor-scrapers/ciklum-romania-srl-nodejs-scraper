# Lessons Learned — Ciklum Romania SRL Scraper

## 1. Oracle HCM SPA: HEAD requests are useless for validation

**Problem:** Oracle HCM career pages are a Single Page Application. The server returns **HTTP 200 for ALL pages** — including expired/removed jobs. The "This page was moved or no longer exists" message is rendered **client-side by JavaScript**, not in the raw HTML.

**Impact:** The `validateByHead()` function (used by EPAM and initially by Ciklum) always returns "active" for every URL, even expired ones. Expired jobs accumulate in SOLR indefinitely.

**Solution:** Use `validateByChromium()` — render the page with `chromium --headless=new --dump-dom --virtual-time-budget=10000` and check the rendered DOM for expired indicators (`error-404__header`, `error-404__description`).

**Rule:** Any scraper targeting an SPA (Oracle HCM, Workday, etc.) MUST use Chromium-based validation, not HEAD or raw GET.

## 1b. Knockout.js template bindings are false positive traps

**Problem:** Oracle HCM uses Knockout.js. The DOM contains `<job-details-checker params="...isExpired: isExpired"><!-- ko if: state().type === 'expired' --><!-- /ko -->` on EVERY page — active or expired. It's a template binding, not a status indicator.

**Impact:** Initially added `state().type === 'expired'` as an expired indicator → marked ALL 23 jobs as expired → deleted all of them from SOLR.

**Solution:** Only check for `error-404__header` and `error-404__description` — these appear ONLY on truly expired pages. The Knockout.js binding is always present regardless of job status.

## 2. How Chromium headless scraping works for Oracle HCM SPA

**Why not use the Oracle HCM REST API directly?**
The API at `ialmme.fa.ocs.oraclecloud.com/hcmRestApi/CandidateExperience/recruitingCEJobRequisitions` returns `content-length: 0` without proper session cookies. The `ora-irc-cx-userid` UUID alone isn't enough — the API requires a server-side session established by the SPA's initial load.

**How Chromium rendering works:**
```bash
chromium --headless=new --disable-gpu --no-sandbox \
  --dump-dom --virtual-time-budget=10000 \
  'https://explore-jobs.ciklum.com/en/sites/ciklum-career/jobs'
```

| Flag | Purpose |
|------|---------|
| `--headless=new` | New headless mode (not the old `--headless`) |
| `--dump-dom` | Print final DOM to stdout |
| `--virtual-time-budget=10000` | Fast-forward 10s of virtual time — lets JS fetch + render jobs |
| `--no-sandbox` | Required in CI (no display server) |

**Without** `--virtual-time-budget`: 0 jobs (DOM captured before API response returns).
**With** `--virtual-time-budget=10000`: 23 jobs (API response received, DOM fully rendered).

**DOM indicators for expired jobs:**
- Active job: `job-details__header`, `data-route="job-details"`, job title in `<h1>`
- Expired job: `error-404__header`, `error-404__description` ("The page was moved or no longer exists")

**Validation flow:**
1. Query SOLR for all jobs by CIF
2. For each job URL, spawn Chromium headless with `--dump-dom --virtual-time-budget=10000`
3. Scan rendered DOM for `error-404__header` or `error-404__description`
4. If found → mark as expired, delete from SOLR
5. If not found → job is active, keep it

## 3. Sed-replace copies structural lies

**Problem:** When copying MD files from EPAM template via `sed 's/EPAM/Ciklum/g'`, structural claims like "This repo is the reference implementation" and "Template repository" were copied verbatim. Ciklum is NOT the template — EPAM is.

**Impact:** README, CONTRIBUTING, AGENTS, BRANCH, TOPICS, PUBLIC, docs/README all incorrectly claimed ciklum was the template repo.

**Solution:** After sed-replace, manually review every MD file for structural claims. Only the canonical template (EPAM) should say "Template repository".

## 4. Workflow file names must match actual filenames

**Problem:** `docs/index.html` referenced `scrape.yml` and `test.yml` for badge URLs. The actual workflow files are `job-seeker-ro-spider.yml` and `automation-testing.yml`.

**Impact:** Badge images broke on GitHub Pages (404 for badge SVGs). "Run Scraper" button pointed to non-existent workflow.

**Solution:** Always verify workflow filenames in badge URLs, button links, and documentation match the actual `.yml` files in `.github/workflows/`.

## 5. Stale descriptions survive sed-replace

**Problem:** sed-replace only swaps company names/URLs. Descriptions like "API-ul public Ciklum Careers", "Oracle HCM API", "fetch (JSON API)" were left unchanged even though ciklum uses Chromium headless, not an API.

**Impact:** 17 incorrect descriptions across 10 MD files + docs/index.html. Users and AI agents get wrong information about how the scraper works.

**Solution:** After sed-replace, grep for technology-specific terms (`API`, `fetch`, `REST`, `HEAD request`, `rate limiting`) and verify they match the actual scraping method.

## 6. AI-DERIVATION-GUIDE.md must exist

**Problem:** AGENTS.md and CONTRIBUTING.md reference `AI-DERIVATION-GUIDE.md` but the file was never copied from EPAM template.

**Impact:** Broken links in critical documentation files. AI agents following instructions would fail to find the derivation playbook.

**Solution:** After copying MD files, verify all referenced files exist. Check for broken `[link](file.md)` references.

## 7. "Template repo" is a structural identity concept, not a cosmetic one

**Problem:** The ciklum repo was set up as a "template" but EPAM is the actual template. This confusion propagated into every MD file.

**Impact:** New scrapers derived from ciklum would inherit the wrong structural claims. The derivation chain becomes unclear.

**Solution:** Only ONE repo can be the template. All derived repos must clearly state they are derived FROM the template, not that they ARE the template.
