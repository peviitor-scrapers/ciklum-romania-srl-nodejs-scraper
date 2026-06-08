# job_seeker_ro_spider

**job_seeker_ro_spider** — scraper pentru job-urile Ciklum din România.

Extrage anunțurile de pe [Ciklum Careers](https://explore-jobs.ciklum.com) și le publică în [peviitor.ro](https://peviitor.ro) prin API-ul SOLR.

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
3. **Scrape-uiește job-urile** — extrage lista completă de job-uri din pagina Ciklum Careers
4. **Transformă datele** — normalizează locațiile (doar orașe românești), tag-urile (lowercase), workmode-ul (remote/on-site/hybrid)
5. **Stochează în SOLR** — upsert în `job` core (job-urile) și `company` core (datele companiei cu adresa completă)

## Structură proiect

```
├── index.js           # Orchestrator principal
├── company.js         # Validare companie (ANAF + Peviitor + SOLR)
├── src/anaf.js        # Modul ANAF API (search + company details)
├── solr.js            # Operații SOLR (query, upsert, delete, company)
├── company.json       # Cache companie (fallback când ANAF e down)
├── ROBOTS.md          # Analiză robots.txt și politici de scraping
├── tests/
│   ├── unit/          # Teste unitare (API-uri mock-uite)
│   ├── integration/   # Teste de integrare (ANAF + SOLR live)
│   └── e2e/           # Teste end-to-end (pipelin complet)
└── .github/workflows/
    ├── scrape.yml     # Rulează zilnic la 6 AM UTC
    └── test.yml       # Teste automate la fiecare push/PR
```

## API-uri folosite

| API | URL | Autentificare |
|---|---|---|
| Ciklum Careers | `https://explore-jobs.ciklum.com/...` | Public |
| ANAF (demoanaf) | `https://demoanaf.ro/api/...` | Public |
| Peviitor | `https://api.peviitor.ro/v1/company/` | Public |
| SOLR (job core) | `https://solr.peviitor.ro/solr/job` | `SOLR_AUTH` |
| SOLR (company core) | `https://solr.peviitor.ro/solr/company` | `SOLR_AUTH` |

## Robots.txt

Ciklum Careers permite accesul complet în robots.txt.

Scraper-ul folosește rate limiting (1s delay între pagini) și un singur User-Agent identificabil.

Pentru analiza completă, vezi [ROBOTS.md](../ROBOTS.md).

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
