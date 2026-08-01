# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-08-01

### Added
- Refactor complet la structura template EPAM: `scraper/` (index, api, company, anaf, demoanaf, markdown-generator, job-validator, validate-jobs + config), `tests/` (unit, integration, e2e, consistency), `ai/` docs, 5 workflow-uri GitHub Actions.
- `scraper/config/company.json` — sursă unică de adevăr pentru identitatea Ciklum (CIF 45871772, CIKLUM ROMANIA S.R.L., brand Ciklum, București).
- `scraper/config/scraper.json` — constante specifice scraping (filter URL, job URL prefix, timeout-uri).
- Scraping prin headless Chromium render (`renderPage`) + parsare regex (`parseApiJobs`) pe pagina Oracle HCM `explore-jobs.ciklum.com` filtrată pe România.
- `scraper/api.js` — client API Peviitor (job core + company core), fără acces direct la SOLR.

### Changed
- Acces direct la SOLR (`solr.js`, `SOLR_AUTH`, upsert la `solr.peviitor.ro`) → totul prin `https://api.peviitor.ro/v1/firme/...`.
- Workflow-urile folosesc step-ul "Ensure company exists in company core" prin `https://api.peviitor.ro/v1/firme/company/add/`.

### Removed
- Fișiere legacy root: `index.js`, `company.js`, `company.json`, `solr.js`, `demoanaf.js`, `validate-jobs.js`, `delete_request.json`, `src/`, `config/`.
- Docs legacy root (`AGENTS.md`, `AI-DERIVATION-GUIDE.md`, `BRANCH.md`, `CHROMIUM-RENDERING.md`, `LESSONS-LEARNED.md`, `TODO.md`, etc.) mutate în `ai/` după convenția template.

### Fixed
- node-fetch v3 `timeout` option înlocuit cu `signal: AbortSignal.timeout(...)` pe toate fetch-urile.
- Retry-loop (pull --rebase + push) pe workflow-urile care fac commit `[skip ci]`.
- `itIfApi`/`itIfAnaf` disponibile via top-level await (corectare skip înainte de beforeAll).

## [0.1.0] - legacy

### Added
- Scraper Ciklum inițial (Chromium render + regex parse, ANOFM merge, deduplicare după URL, SOLR direct).
