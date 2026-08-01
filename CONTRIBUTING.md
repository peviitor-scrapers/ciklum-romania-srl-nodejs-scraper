# Contributing to Ciklum Scraper

Acest scraper face parte din ecosistemul [peviitor.ro](https://peviitor.ro). A fost derivat din [template-ul EPAM Systems International SRL](https://github.com/sebiboga/epam-systems-international-srl-nodejs-scraper).

## About Derived Scrapers

This is a **derived scraper** — it was created from the EPAM template and customized for Ciklum. All derived scrapers share the same architecture:

- `scraper/config/company.json` — single source of truth for company identity
- `scraper/index.js` — company-specific scraping logic (Chromium render + parse)
- `scraper/api.js` — Peviitor API client (job core + company core)
- `tests/` — comprehensive test suite (unit, integration, e2e, consistency)
- `.github/workflows/` — CI/CD pipelines

To derive a new scraper from the EPAM template, see the template's CONTRIBUTING.md.
