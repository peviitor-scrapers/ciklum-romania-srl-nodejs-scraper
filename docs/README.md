# job_seeker_ro_spider

**job_seeker_ro_spider** — scraper pentru job-urile Ciklum din România.

Extrage anunțurile de pe [Ciklum Careers Romania](https://explore-jobs.ciklum.com/en/sites/ciklum-career/jobs) și le publică în [peviitor.ro](https://peviitor.ro) prin API-ul SOLR.

## Identificare

Toate request-urile HTTP folosesc User-Agent-ul:

```
job_seeker_ro_spider
```

## Ce face

1. **Validează compania** — interoghează API-ul public ANAF ([demoanaf.ro](https://demoanaf.ro)) după CIF-ul Ciklum (45871772) și verifică:
   - Denumirea oficială: CIKLUM ROMANIA SRL
   - Status: activ/inactiv/radiat
   - Adresa completă din registrul comerțului
2. **Cross-validează cu Peviitor** — verifică existența companiei în API-ul Peviitor
3. **Scrape-uiește job-urile** — extrage lista completă de job-uri de pe Ciklum Careers prin Chromium headless (rendering SPA), filtrat pe România
4. **Transformă datele** — normalizează locațiile (doar orașe românești), tag-urile (lowercase), workmode-ul (remote/on-site/hybrid)
5. **Stochează în SOLR** — upsert în `job` core (job-urile) și `company` core (datele companiei cu adresa completă)
6. **Generează docs/jobs.md** — fișier markdown cu informații companie + toate job-urile curente, publicat pe [GitHub Pages](https://sebiboga.github.io/ciklum-romania-srl-nodejs-scraper/jobs.md)

## Structură proiect

```
├── config/company.json         # Sursa unică de adevăr (CIF, brand, URL-uri, API)
├── config/company.js           # Loader ESM pentru config/company.json
├── index.js                    # Orchestrator principal
├── company.js                  # Validare companie (ANAF + Peviitor + SOLR) cu cache 7 zile
├── demoanaf.js                 # CLI wrapper pentru src/anaf.js
├── src/anaf.js                 # Modul ANAF API (search + company details)
├── src/markdown-generator.js   # Generează docs/jobs.md după scrape
├── src/job-validator.js        # Primitivă comună: validateByHead, validateByContent
├── solr.js                     # Operații SOLR (query, upsert, delete, company)
├── company.json                # Cache ANAF (committed, TTL 7 zile, fallback la stale)
├── ROBOTS.md          # Analiză robots.txt și politici de scraping
├── tests/
│   ├── unit/          # 56 teste unitare (API-uri mock-uite)
│   ├── integration/   # 16 teste de integrare (ANAF + SOLR live)
│   └── e2e/           # 13 teste end-to-end (pipelin complet)
└── .github/workflows/
    ├── job-seeker-ro-spider.yml     # Rulează zilnic la 6 AM UTC
    └── automation-testing.yml       # Teste automate la fiecare push/PR
```

## API-uri folosite

| API | URL | Autentificare |
|---|---|---|
| Ciklum Careers | `https://explore-jobs.ciklum.com/en/sites/ciklum-career/jobs` | Public (Chromium headless) |
| ANAF (demoanaf) | `https://demoanaf.ro/api/...` | Public |
| Peviitor | `https://api.peviitor.ro/v1/company/` | Public |
| SOLR (job core) | `https://solr.peviitor.ro/solr/job` | `SOLR_AUTH` |
| SOLR (company core) | `https://solr.peviitor.ro/solr/company` | `SOLR_AUTH` |

## Robots.txt

Ciklum Careers [robots.txt](https://explore-jobs.ciklum.com/robots.txt) dezactivează:
- `/api/*` — API-ul JSON folosit de scraper
- `/*/vacancy/*` — paginile individuale de job

Scraper-ul folosește Chromium headless pentru a renderiza pagina SPA și a extrage DOM-ul cu job-uri. Un singur User-Agent identificabil este folosit.

Pentru analiza completă, vezi [ROBOTS.md](../ROBOTS.md).

## 🌱 Derived Scrapers

Template-ul EPAM a fost folosit pentru a deriva scraper-e pentru alte companii:

| Repo | Companie | CIF | Metodă | Status |
|------|----------|-----|--------|--------|
| [mejix-srl-nodejs-scraper](https://github.com/sebiboga/mejix-srl-nodejs-scraper) | MEJIX SRL | 17372688 | HTML scraping (cheerio) | ✅ Live |
| [talent-matchmakers-srl-nodejs-scraper](https://github.com/sebiboga/talent-matchmakers-srl-nodejs-scraper) | TALENT MATCHMAKERS S.R.L. | 38460545 | Teamtailor HTML (cheerio) | ✅ Live |
| [artsoft-consult-srl-nodejs-scraper](https://github.com/sebiboga/artsoft-consult-srl-nodejs-scraper) | ARTSOFT CONSULT SRL | 15997630 | HTML scraping (cheerio) | ✅ Live |
| [rapel-srl-nodejs-scraper](https://github.com/sebiboga/rapel-srl-nodejs-scraper) | RAPEL SRL | 5665609 | jobRapid.ro HTML + ANOFM API | ✅ Live |
| [continental-hotels-srl-nodejs-scraper](https://github.com/sebiboga/continental-hotels-srl-nodejs-scraper) | CONTINENTAL HOTELS SA | 1559737 | POST AJAX → HTML (cheerio) | ✅ Live |
| [coera-bc-srl-nodejs-scraper](https://github.com/sebiboga/coera-bc-srl-nodejs-scraper) | COERA BC SRL | 32519996 | HTML scraping (cheerio) | ✅ Live |
| [stefanini-romania-srl-nodejs-scraper](https://github.com/sebiboga/stefanini-romania-srl-nodejs-scraper) | STEFANINI ROMANIA SRL | 16139707 | SmartSearchOnline HTML (cheerio) | ✅ Live |
| [metro-cash-carry-romania-srl-nodejs-scraper](https://github.com/sebiboga/metro-cash-carry-romania-srl-nodejs-scraper) | METRO CASH & CARRY ROMANIA SRL | 8119423 | HTML/cheerio | ✅ Live |
| [qualitest-dc-ro-srl-nodejs-scraper](https://github.com/sebiboga/qualitest-dc-ro-srl-nodejs-scraper) | QUALITEST DC RO S.R.L. | 39814543 | Workable JSON API | ✅ Live |

**Pitfall #12 — ANOFM job scraping by CIF:** API-ul public ANOFM (`/api/entity/vw_public_job_posting`) oferă job-uri gratis filtrate pe CIF. Adăugați `searchANOFM(cif)` în scraper pentru a nu pierde job-uri de pe această platformă. Location se returnează ca array (`[loc]`).

## Testare

```bash
# Toate testele
npm test

# Doar unitare
npm run test:unit

# Doar integrare (necesită ANAF live, SOLR conditional)
npm run test:integration

# Doar E2E (API real Ciklum + ANAF + SOLR)
npm run test:e2e
```

Testele SOLR folosesc `itIfSolr` — se auto-skip dacă variabila `SOLR_AUTH` nu e setată.
