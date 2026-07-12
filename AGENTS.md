# AGENTS.md — Rules for AI agents

## Project
Ciklum scraper for peviitor.ro (Node.js, ESM, Jest)

## Critical Rules

### 0. Background tasks — always pass `--repo` explicitly to `gh`

When polling a workflow run with `until [ "$(gh run view ID --json status -q .status)" = "completed" ]; do sleep N; done`, the `gh run view` command implicitly uses the current working directory's git remote. If the CWD is a different repo (e.g. you cd-ed elsewhere mid-task), `gh` looks in the wrong repo and returns 404 — the loop's check becomes `"" != "completed"` (always true) and the background task sleeps forever.

**Always specify the repo explicitly:**
```bash
gh run view <RUN_ID> --repo sebiboga/ciklum-romania-srl-nodejs-scraper --json status -q .status
```

Before starting any `gh run watch` or polling loop in the background, sanity-check:
- Does the command include `--repo`?
- Is the run ID from the same repo as `--repo`?

If you spawn a stuck task, kill it immediately rather than letting it hang.

### 1. Temporary Files
All temporary/scratch files MUST go in `tmp/` inside the project root.
NEVER use paths outside the project (e.g. `C:\Users\...\AppData\Local\Temp\opencode`).

### 2. Issues & GitHub
- **Orice modificare de cod trebuie să aibă un issue în GitHub Issues** (vezi [ISSUES.md](ISSUES.md))
- Excepții: typo-uri, whitespace, documentație minoră
- Create a GitHub issue before implementing any change
- Commit messages must reference the issue they close
- Never commit credentials (`.env.local`, `*.pem`, etc.)
- Push after commit

### 3. Environment Variables
- `SOLR_AUTH` must be set in `.env.local` for SOLR tests (format: `user:password`)
- `.env.local` is loaded automatically at runtime via `dotenv` (see `package.json`) — never commit it
- Consistency tests also need `GITHUB_REPOSITORY` (format: `owner/repo`) and `GITHUB_TOKEN`

### 4. Testing
```bash
# All tests
npm test

# Unit tests (no env vars needed)
npm run test:unit

# Integration tests (ANAF public API, SOLR conditional)
npm run test:integration

# E2E tests (real Ciklum API, SOLR conditional)
npm run test:e2e

# Consistency tests (GitHub repo config — needs GITHUB_REPOSITORY + GITHUB_TOKEN)
npm run test:consistency
```

### 5. ESM + Jest
- Use `jest.unstable_mockModule` (NOT `jest.mock`) for mocking ESM modules
- Run with `--experimental-vm-modules` flag
- SOLR tests use conditional `itIfSolr` helper — auto-skip when `SOLR_AUTH` not set

### 6. Verification
- După orice modificare, urmează [VERIFY.md](VERIFY.md) pas cu pas
- Ultimul pas = rulează scraperul prin GitHub Actions, verifică job-urile în SOLR, și verifică că `docs/jobs.md` a fost generat și este accesibil pe GitHub Pages
- Toate workflow-urile din `.github/workflows/` trebuie să treacă înainte de merge

### 7. Module Structure
- `config/company.json` + `config/company.js` — single source of truth for company identity
- `src/anaf.js` — core ANAF library (imported by company.js); retry logic: 3 retries, 2s exponential backoff; includes cuifirma.ro fallback
- `src/cuifirma.js` — CUIFirma MCP fallback for ANAF demoanaf.ro
- `src/markdown-generator.js` — generates `docs/jobs.md` after each scrape; called from index.js
- `src/job-validator.js` — shared `validateByHead` + `validateByContent` used by both validator CLIs
- `demoanaf.js` — CLI wrapper around src/anaf.js
- `company.js` — company validation (ANAF + Peviitor + SOLR); root `company.json` is ANAF cache committed to repo
- `solr.js` — SOLR operations
- `validate-jobs.js` — manual deep validator (content-aware); thin wrapper over src/job-validator.js
- `tests/validate-ciklum-jobs.js` — CI fast validator (HEAD only); thin wrapper over src/job-validator.js + solr.js
- `index.js` — main scraper orchestrator

### 8. Caching Behavior
- `tmp/company.json` — per-run scratch cache (gitignored)
- `company.json` (root) — committed cache, refreshed when stale
- If ANAF is unreachable AND cache is stale, the code falls back to the stale cache rather than failing the scrape
- `docs/company.json` is regenerated on every scrape so GitHub Pages can read company identity

### 9. Scraper Architecture
- Uses Chromium headless with `--dump-dom --virtual-time-budget=10000` to render the SPA (see [CHROMIUM-RENDERING.md](CHROMIUM-RENDERING.md))
- Ciklum careers page is an Oracle HCM SPA, jobs load via JavaScript — the Oracle HCM REST API requires session cookies not available externally
- Chromium renders the full page, waits 10s for JS to fetch jobs, then we parse the rendered DOM
- DOM parsing: extract `href`, `job-tile__title`, `primaryLocation`, `workplaceTypeName` via regex
- Job URL: `https://explore-jobs.ciklum.com/en/sites/ciklum-career/job/{Id}`
- Romania filter: `selectedLocationsFacet=300000000468495` in the URL

### 10. Auto-Heal Issues
When the `Automation Tests` workflow fails, a **GitHub Issue** is auto-created with label `auto-heal`. The issue contains:
- Run URL, branch, commit, and trigger event
- Instructions for opencode to investigate, fix, commit, push, and close

**When you see an `auto-heal` labeled issue:**
1. Read the issue body for the run URL and branch
2. Checkout that branch
3. Review the workflow logs to diagnose the failure
4. Apply the fix
5. Commit, push, and close the issue
