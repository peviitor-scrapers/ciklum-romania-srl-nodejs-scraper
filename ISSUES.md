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

## Issue-uri deschise

### ISSUE-1: package.json structural diffs vs EPAM template

**Fișier:** `package.json`

Diferențe structurale față de EPAM template (nu doar company swap):

1. **Lipsă `verbose: true`** în jest config — EPAM are, ciklum nu
2. **Lipsă `testTimeout: 30000`** în jest config — EPAM are, ciklum nu
3. **`setupFilesAfterSetup: []`** — este în ciklum dar NU în EPAM (și e typo: ar trebui `setupFilesAfterSetup` or `setupFiles`) — trebuie scos
4. **Cheerio version diferită:** ciklum `^1.2.0`, EPAM `^1.0.0-rc.12` — alegere: rămâne `^1.2.0` (mai nou) sau se sync cu EPAM `^1.0.0-rc.12`
5. **Axios în ciklum** dar NU în EPAM — ciklum îl folosește? Dacă nu, se scoate
6. **Lipsă newline la final** — EPAM nu are, ciklum are
7. **Versiune:** ciklum `1.0.0`, EPAM `1.5.0` — se lasă `1.0.0` (ciklum e independent)

**Acțiune:** Copiază structura jest config din EPAM (`verbose`, `testTimeout`, ordine câmpuri). Verifică dacă `axios` e folosit în `index.js` — dacă da, păstrează-l; dacă nu, scoate-l. Verifică dacă `cheerio ^1.2.0` funcționează cu codul existent.

---

### ISSUE-2: delete_request.json trailing newline

**Fișier:** `delete_request.json`

Diferență minoră: ciklum are trailing newline, EPAM nu. Conținutul JSON e identic.

**Acțiune:** Nicio acțiune necesară — nu afectează funcționalitatea.

---

### ISSUE-3: docs/README.md — referințe EPAM în tabel

**Fișier:** `docs/README.md`

Când s-a făcut sed-replace, liniile cu URL-uri EPAM au rămas corecte ca și URL (pentru că EPAM template are EPAM URLs). Dar trebuie verificat că liniile 54 și 62 nu mai trimit către `careers.epam.com` sub label-ul "Ciklum".

**Status:** ✅ VERIFICAT — ZERO referințe EPAM rămase în docs/ (grep confirmat).

---

### ISSUE-4: Restul fișierelor MD — diferențe legitime (nu de修复at)

Următoarele fișiere au diferențe față de EPAM dar sunt **corecte** (sunt company-specific swaps deja făcute):

- `README.md` — EPAM → Ciklum, URL-uri ciklum corecte
- `AGENTS.md` — EPAM → Ciklum
- `CONTRIBUTING.md` — EPAM → Ciklum (derivation guide examples)
- `INSTRUCTIONS.md` — EPAM → Ciklum
- `ROBOTS.md` — EPAM → Ciklum
- `VERIFY.md` — EPAM → Ciklum
- `company-model.md` — "EPAM Systems" group → "Ciklum"
- `files.md` — EPAM → Ciklum
- `solr.js` — EPAM → Ciklum
- `validate-jobs.js` — EPAM → Ciklum
- `tests/package.json` — EPAM → Ciklum (name only)

**Acțiune:** Nicio acțiune — acestea sunt diferențe intenționate.

---

### ISSUE-5: Rulare test + scrape workflow

Odată ce ISSUE-1 e rezolvat:

1. `npm install` — verifică că dependențele instalează fără erori
2. `npm test` — rulează toate testele, verifică trecerea
3. `npm run lint` / `npm run typecheck` (dacă există)
4. Push + trigger `Automation Tests` workflow
5. Dacă trece → trigger `Oportunitati SI Cariere` workflow
6. Verifică: SOLR jobs, `docs/jobs.md` pe GitHub Pages, peviitor.ro

---

## Note suplimentare

- **Zero referințe EPAM** rămase în source/test files (confirmat cu grep)
- **Zero referințe EPAM** rămase în docs/ (confirmat cu grep)
- **Toate diferențele MD** rămase sunt company-specific swaps legitime (nu bug-uri)
- **Structura workflow-urilor** (`.github/workflows/`) este complet aliniată cu EPAM template
- **`config/company.json`** este single source of truth — funcționează corect cu `ensure-company-core`
- **Chromium rendering** funcționează cu `--virtual-time-budget=10000` (documentat în `CHROMIUM-RENDERING.md`)
