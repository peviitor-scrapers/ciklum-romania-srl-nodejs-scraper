# TODO — Structural Alignment with EPAM Template

**EPAM repo** (`/home/sebi/epam-systems-international-srl-nodejs-scraper/`) is the canonical template.
This repo must be **structurally identical** — same file structure, same code, same config — with ONLY company values swapped (CIF, brand, legal name, API URLs).

---

## 🔴 NOT DONE

- [ ] **#7** Fix package.json jest config (add `verbose: true`, `testTimeout: 30000`, remove `setupFilesAfterSetup`)
- [ ] **#8** Check if `axios` is used — remove if unused
- [ ] **#9** Verify `cheerio ^1.2.0` works (or sync with EPAM `^1.0.0-rc.12`)
- [ ] **#10** `npm install` clean
- [ ] **#11** `npm test` — all pass
- [ ] **#12** Fix any test failures
- [ ] **#13** Run lint/typecheck
- [ ] **#14** Commit all fixes + push
- [ ] **#15** Automation Tests workflow passes on GitHub Actions
- [ ] **#16** Trigger Oportunitati SI Cariere workflow
- [ ] **#17** Verify SOLR jobs (`company:Ciklum*`)
- [ ] **#18** Verify docs/jobs.md on GitHub Pages
- [ ] **#19** Verify peviitor.ro
- [ ] **#20** 🎯 LAST — final structural identity diff check vs EPAM

## 🟡 IN PROGRESS

- [ ] **#6** Commit pending MD/doc sed-replacement changes (18 files staged)
- [ ] **#3** Close stale auto-heal issue

## ✅ DONE

- [x] All MD files copied from EPAM + sed-replaced (AGENTS, CONTRIBUTING, INSTRUCTIONS, README, ROBOTS, VERIFY, company-model, job-model, files, PUBLIC, ISSUES, UPDATE-REPO-ABOUT, docs/README)
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
- [x] `CHROMIUM-RENDERING.md` created + linked
- [x] `tests/validate-ciklum-jobs.js` renamed correctly
- [x] All pending changes committed and pushed (multiple commits)
