# Issues

Acest proiect folosește [GitHub Issues](https://github.com/sebiboga/ciklum-romania-srl-nodejs-scraper/issues) pentru a urmări munca.

## Regulă

**Orice modificare de cod trebuie să aibă un issue corespunzător în GitHub Issues.**

Excepții:
- Corecturi minore (typo-uri, whitespace, comentarii)
- Changeset-uri care rezolvă un issue existent

## Flux

1. Creăm un issue care descrie ce trebuie făcut
2. Implementăm modificarea
3. Commit-ul menționează issue-ul (ex: `#7`)
4. Închidem issue-ul cu un comentariu care link-uiește commit-ul

---

## Issue-uri rezolvate

### ISSUE-1: package.json structural diffs vs EPAM template ✅ RESOLVED

**Fișier:** `package.json`

Diferențe structurale față de EPAM template — **rezolvate**:
- `verbose: true` adăugat în jest config
- `testTimeout: 30000` adăugat în jest config
- `setupFilesAfterSetup` scos (era typo, nu există în EPAM)
- `axios` scos (nefolosit)
- `cheerio ^1.2.0` păstrat (funcționează)

### ISSUE-2: delete_request.json trailing newline ✅ RESOLVED

Conținutul JSON e identic cu EPAM. Trailing newline nu afectează funcționalitatea.

### ISSUE-3: docs/README.md — referințe EPAM ✅ RESOLVED

Toate referințele EPAM au fost corijate:
- URL-uri careers.epam.com → explore-jobs.ciklum.com
- Descriere API → Chromium headless
- Robots.txt analysis actualizat

### ISSUE-4: Restul fișierelor MD ✅ RESOLVED

Toate diferențele legitime (company-specific swaps) au fost verificate și corectate unde era necesar.

### ISSUE-5: Rulare test + scrape workflow ✅ RESOLVED

- `npm install` — clean
- `npm test` — 108 teste trec (unit + integration + e2e + consistency)
- Automation Tests workflow: PASS (run 29183057851)
- Oportunitati SI Cariere workflow: PASS (run 29183117574)
- SOLR: 24 jobs uploaded
- docs/jobs.md: LIVE on GitHub Pages

### ISSUE-6: MD files Chromium/API audit ✅ RESOLVED

All MD files audited and corrected — zero stale "API" references to Ciklum scraping.
Files corrected: AGENTS.md, CONTRIBUTING.md, INSTRUCTIONS.md, README.md, ROBOTS.md, UPDATE-REPO-ABOUT.md, files.md, docs/README.md, TODO.md, ISSUES.md.
