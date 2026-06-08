# job_seeker_ro_spider — Ciklum Careers Romania Scraper

[![WebScraper Ciklum to Peviitor](https://github.com/sebiboga/ciklum-romania-srl-nodejs-scraper/actions/workflows/scrape.yml/badge.svg)](https://github.com/sebiboga/ciklum-romania-srl-nodejs-scraper/actions/workflows/scrape.yml)
[![Automation Tests](https://github.com/sebiboga/ciklum-romania-srl-nodejs-scraper/actions/workflows/test.yml/badge.svg)](https://github.com/sebiboga/ciklum-romania-srl-nodejs-scraper/actions/workflows/test.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![JavaScript](https://img.shields.io/badge/javascript-ESM-F7DF1E?logo=javascript&logoColor=black)](https://ecma-international.org/)
[![Node.js](https://img.shields.io/badge/node-24-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)

**job_seeker_ro_spider** — un scraper pentru job-urile Ciklum din România. Extrage anunțurile de pe [Ciklum Careers](https://explore-jobs.ciklum.com) și le publică în [peviitor.ro](https://peviitor.ro) prin API-ul SOLR.

## Overview

Proiectul automatizează colectarea zilnică a job-urilor Ciklum din România, menținând board-ul peviitor.ro la zi cu cele mai recente oportunități de carieră.

## Features

- Extrage job-uri din pagina Ciklum Careers
- Validează compania via ANAF (CUI, status activ/inactiv, adresă completă)
- Cross-validează cu Peviitor API
- Stochează în SOLR (job core + company core)
- GitHub Actions: scrape zilnic + testare automată (unit, integration, e2e)
- Teste SOLR condiționale — auto-skip când `SOLR_AUTH` nu e setat
- Se identifică prin User-Agent: `job_seeker_ro_spider`

## Project Structure

```
├── index.js           # Main scraper entry point
├── company.js         # Company validation via ANAF + Peviitor + SOLR
├── src/anaf.js        # ANAF API core module (search + company details)
├── solr.js            # SOLR operations (query, upsert, delete, company)
├── company.json       # Cached company data (fallback when ANAF is down)
├── ROBOTS.md          # robots.txt analysis and scraping policy
├── tests/             # Test suite
│   ├── unit/          # Unit tests (mocked APIs)
│   ├── integration/   # Integration tests (ANAF + SOLR live)
│   └── e2e/           # End-to-end tests (full pipeline)
├── .github/workflows/
│   ├── scrape.yml     # Daily scraping at 6 AM UTC
│   └── test.yml       # Automation Tests on push/PR
└── package.json
```

## Setup

### Prerequisites

- Node.js 24+
- npm

### Installation

```bash
npm install
```

### Configuration

Set the `SOLR_AUTH` environment variable with your Solr credentials:

```bash
export SOLR_AUTH="username:password"
```

## Usage

### Run the Scraper

```bash
npm run scrape
```

### Run Tests

```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e
```

## Workflows

### Daily Scraping

The `scrape.yml` workflow runs daily at 6 AM UTC via GitHub Actions. It:
1. Validates company data via ANAF
2. Scrapes current job listings from Ciklum Careers
3. Updates Solr with new/removed jobs
4. Uploads job data as artifacts

### Test Automation

The `test.yml` workflow runs on every push and pull request.

## Acknowledgments

This project was developed with assistance from:
- **[OpenCode](https://opencode.ai)** - AI-powered CLI tool for software engineering
- **Big Pickle LLM** - Large language model powering OpenCode

## License

Copyright (c) 2024-2026 BOGA SEBASTIAN-NICOLAE

Licensed under the [MIT License](LICENSE).

## Managed By

This project is managed by [ASOCIATIA OPORTUNITATI SI CARIERE](https://oportunitatisicariere.ro) and used as a web scraper for the [peviitor.ro](https://peviitor.ro) job board project.

## Robots.txt Policy

Acest scraper respectă regulile din [robots.txt](https://explore-jobs.ciklum.com/robots.txt) al Ciklum Careers. Pentru analiza completă, vezi [ROBOTS.md](ROBOTS.md).

## Disclaimer

This scraper is designed for educational purposes and legitimate job data aggregation for the Romanian job market. Please respect Ciklum's Terms of Service and robots.txt when using this scraper.
