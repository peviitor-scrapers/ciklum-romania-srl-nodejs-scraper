# Changelog

## [1.0.0] — 2026-08-01

### Added
- Scraper derivat din template-ul EPAM Systems International SRL
- Refactor: migrare de la layout-ul legacy (root `index.js`, `solr.js`, `src/`) la structura template (`scraper/`, `tests/`, `ai/`, 5 workflows)
- Scraping job-uri de pe Ciklum Careers (https://explore-jobs.ciklum.com, Oracle HCM SPA) renderat cu headless Chromium (`renderPage`) + parsare regex (`parseApiJobs`)
- CIF: 45871772 (CIKLUM ROMANIA S.R.L., brand Ciklum)
- Localizare implicită: București
- Fără internship/students page dedicat (neconfirmat)
- ANOFM scraping inclus
- Eliminare acces direct la SOLR — totul prin API Peviitor (`scraper/api.js`)
- Workflow CI: scrape zilnic (6 AM UTC) + teste automate (unit, integration, e2e, consistency)
