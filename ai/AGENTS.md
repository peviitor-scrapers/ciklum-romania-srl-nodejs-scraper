# AI Agent Instructions for Ciklum Scraper

## 🌱 This Repo Is a Derived Scraper

Aceste instrucțiuni sunt pentru agenții AI care întrețin acest scraper Ciklum. A fost derivat din [template-ul EPAM Systems International SRL](https://github.com/sebiboga/epam-systems-international-srl-nodejs-scraper).

## Company Identity

- **Legal Name:** CIKLUM ROMANIA S.R.L.
- **Brand:** Ciklum
- **CIF:** 45871772
- **Website:** https://www.ciklum.com
- **Careers:** https://explore-jobs.ciklum.com
- **Scraping Method:** Oracle HCM SPA renderat cu headless Chromium (`renderPage`), parsare regex pe HTML-ul renderat (`parseApiJobs`)
- **Default Location:** București

## Maintenance Notes

- Single source of truth: `scraper/config/company.json`
- Ciklum-specific constants (filter URL, job URL prefix, timeout-uri) stau în `scraper/config/scraper.json`
- Nu există internship/students page dedicat — nu adăuga internshipUrl fără verificare
- Scraperul se bazează pe un binary Chromium/Chrome disponibil local (probe: `google-chrome-stable`, `google-chrome`, `chromium`, `chromium-browser`; suprascrie cu `CHROMIUM_BIN`)
- All ANAF, Peviitor, and SOLR company references use the values above
- Tests use dynamic imports from `scraper/config/company.js` (no hardcoded CIF/brand in most test files)
