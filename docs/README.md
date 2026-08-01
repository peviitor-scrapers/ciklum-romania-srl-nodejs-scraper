# job_seeker_ro_spider

**job_seeker_ro_spider** — scraper pentru job-urile Ciklum din România.

Extrage anunțurile de pe [Ciklum Careers Romania](https://explore-jobs.ciklum.com/en/sites/ciklum-career/jobs) și le publică în [peviitor.ro](https://peviitor.ro) prin API-ul Peviitor.

## Identificare

Toate request-urile HTTP folosesc User-Agent-ul:

```
job_seeker_ro_spider
```

## Ce face

1. **Validează compania** — interoghează API-ul public ANAF ([demoanaf.ro](https://demoanaf.ro)) după CIF-ul Ciklum (45871772) și verifică:
   - Denumirea oficială: CIKLUM ROMANIA S.R.L.
   - Status: activ/inactiv/radiat
   - Adresa completă din registrul comerțului
2. **Cross-validează cu Peviitor** — verifică existența companiei în API-ul Peviitor
3. **Scrape-uiește job-urile** — renderizează cu headless Chromium pagina Ciklum Careers (Oracle HCM SPA, filtrată pe România) și extrage job-urile din DOM-ul renderat
4. **Transformă datele** — normalizează locațiile (doar orașe românești), tag-urile (lowercase), workmode-ul (remote/on-site/hybrid)
5. **Stochează în API Peviitor** — upsert/delete prin REST API (job core + company core)
6. **Generează docs/jobs.md** — fișier markdown cu informații companie + toate job-urile curente, publicat pe [GitHub Pages](https://peviitor-scrapers.github.io/ciklum-romania-srl-nodejs-scraper/jobs.md)

## Structură proiect

```
├── scraper/
│   ├── config/company.json          # Sursa unică de adevăr (CIF, brand, URL-uri)
│   ├── config/scraper.json          # Constante specifice scraping (filter URL, timeout)
│   ├── index.js                     # Orchestrator principal (Chromium render + parse)
│   ├── company.js                   # Validare companie (ANAF + Peviitor) cu cache 7 zile
│   ├── api.js                       # Operații API Peviitor (query, upsert, delete)
│   ├── anaf.js                      # Modul ANAF API (search + company details)
│   ├── markdown-generator.js        # Generează docs/jobs.md după scrape
│   ├── job-validator.js             # Primitivă comună: validateByHead, validateByContent
│   ├── validate-jobs.js             # Validator manual de job-uri (deep check)
│   └── demoanaf.js                  # CLI wrapper pentru scraper/anaf.js
├── ai/ROBOTS.md                     # Analiză robots.txt și politici de scraping
├── tests/
│   ├── unit/          # Teste unitare (API-uri mock-uite)
│   ├── integration/   # Teste de integrare (ANAF + Peviitor live)
│   ├── e2e/           # Teste end-to-end (pipelin complet)
│   ├── consistency/   # Teste de consistență (branch, Pages, topic-uri)
│   └── validate-ciklum-jobs.js  # Validator CI rapid (HEAD only)
└── .github/workflows/
    ├── job-seeker-ro-spider.yml     # Rulează zilnic la 6 AM UTC
    └── automation-testing.yml       # Teste automate la fiecare push/PR
```

## API-uri folosite

| API | URL | Autentificare |
|---|---|---|
| Ciklum Careers (Oracle HCM) | `https://explore-jobs.ciklum.com` | Public (SPA, renderizat cu Chromium) |
| ANAF (demoanaf) | `https://demoanaf.ro/api/...` | Public |
| CUIScan | `https://cuiscan.ro/api/...` | Public |
| Peviitor | `https://api.peviitor.ro/v1/` | Public |

## Robots.txt

Ciklum Careers [robots.txt](https://explore-jobs.ciklum.com/robots.txt) dezactivează:
- `/api/*` — API-ul JSON (NU e folosit de scraper)
- `/*/vacancy/*` — paginile individuale de job

Scraperul renderizează cu Chromium headless o singură pagină permisă (`/en/sites/ciklum-career/jobs`), cu User-Agent identificabil. Paginile individuale de job sunt doar verificate (HEAD request), nu parse-uite.

Pentru analiza completă, vezi [ROBOTS.md](../ai/ROBOTS.md).

## 🌱 Derived Scrapers

Acest template a fost folosit pentru a deriva scraper-e pentru alte companii:

| Repo | Companie | CIF | Metodă | Status |
|------|----------|-----|--------|--------|
| [mejix-srl-nodejs-scraper](https://github.com/sebiboga/mejix-srl-nodejs-scraper) | MEJIX SRL | 17372688 | HTML scraping (cheerio) | ✅ Live |
| [talent-matchmakers-srl-nodejs-scraper](https://github.com/sebiboga/talent-matchmakers-srl-nodejs-scraper) | TALENT MATCHMAKERS S.R.L. | 38460545 | Teamtailor HTML (cheerio) | ✅ Live |
| [artsoft-consult-srl-nodejs-scraper](https://github.com/sebiboga/artsoft-consult-srl-nodejs-scraper) | ARTSOFT CONSULT SRL | 15997630 | HTML scraping (cheerio) | ✅ Live |
| [rapel-srl-nodejs-scraper](https://github.com/sebiboga/rapel-srl-nodejs-scraper) | RAPEL SRL | 5665609 | jobRapid.ro HTML + ANOFM API | ✅ Live |
| [continental-hotels-srl-nodejs-scraper](https://github.com/sebiboga/continental-hotels-srl-nodejs-scraper) | CONTINENTAL HOTELS SA | 1559737 | POST AJAX → HTML (cheerio) | ✅ Live |
| [coera-bc-srl-nodejs-scraper](https://github.com/sebiboga/coera-bc-srl-nodejs-scraper) | COERA BC SRL | 32519996 | HTML scraping (cheerio) | ✅ Live |

**Pitfall #12 — ANOFM job scraping by CIF:** API-ul public ANOFM (`/api/entity/vw_public_job_posting`) oferă job-uri gratis filtrate pe CIF. Adăugați `searchANOFM(cif)` în scraper pentru a nu pierde job-uri de pe această platformă. Location se returnează ca array (`[loc]`).

## Testare

```bash
# Toate testele
npm test

# Doar unitare
npm run test:unit

# Doar integrare (necesită ANAF live, Peviitor API conditional)
npm run test:integration

# Doar E2E (API real Ciklum Careers + ANAF + Peviitor)
npm run test:e2e
```

Testele de integrare folosesc `itIfApi`/`itIfAnaf` — se auto-skip dacă API-ul nu e disponibil.
