# TODO — Structural Alignment with EPAM Template

**EPAM repo** (`/home/sebi/epam-systems-international-srl-nodejs-scraper/`) is the canonical template.
This repo must be **structurally identical** — same file structure, same code, same config — with ONLY company values swapped (CIF, brand, legal name, API URLs).

---

## ✅ ALL DONE

- [x] All MD files copied from EPAM + sed-replaced
- [x] Workflow rewrite: `job-seeker-ro-spider.yml` (EPAM structure, `Oportunitati SI Cariere`)
- [x] Workflow rewrite: `automation-testing.yml` (EPAM structure, auto-heal, validate-jobs)
- [x] `config/company.json` + `config/company.js` created (CIF 45871772)
- [x] `src/cuifirma.js` created (CUIFirma MCP fallback)
- [x] `src/anaf.js` updated with cuifirma fallback
- [x] `src/markdown-generator.js` created
- [x] `src/job-validator.js` created
- [x] `index.js` updated: Chromium headless, `--virtual-time-budget=10000`, job model compliant
- [x] Job model compliance: removed `source`, `postingDate`, location `Romania` → `București`
- [x] Company model compliance: `scraperFile` URL `master` → `main`, `Bucuresti` → `București`
- [x] Zero EPAM references in source/test files (grep confirmed)
- [x] Zero EPAM references in docs/ (grep confirmed — all Chromium/API references fixed)
- [x] `CHROMIUM-RENDERING.md` created + linked
- [x] `tests/validate-ciklum-jobs.js` renamed correctly
- [x] All pending changes committed and pushed
- [x] `npm install` clean
- [x] `npm test` — all 108 tests pass
- [x] Automation Tests workflow passes on GitHub Actions (run 29183057851)
- [x] Oportunitati SI Cariere workflow passes on GitHub Actions (run 29183117574)
- [x] SOLR jobs uploaded (24 jobs for CIF 45871772)
- [x] `docs/jobs.md` on GitHub Pages — LIVE with 23 job listings
- [x] Structural identity diff check vs EPAM — all differences accounted for
- [x] MD files audit: all Chromium/API references corrected (AGENTS, CONTRIBUTING, INSTRUCTIONS, README, ROBOTS, UPDATE-REPO-ABOUT, files, docs/README)
