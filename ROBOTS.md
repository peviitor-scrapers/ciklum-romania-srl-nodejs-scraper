# Robots.txt Analysis — Ciklum Careers

Sursa: https://explore-jobs.ciklum.com/robots.txt

## Reguli

```
User-agent: LinkedInBot
Allow: /

User-agent: *
Disallow: /en/application
Disallow: /ru/application
Disallow: /api
Disallow: /api/*
Disallow: /*?skill*
Disallow: /*?search*
Disallow: /*?query*
Disallow: /*?specialization*
Disallow: /*?utm*
Disallow: /none
Disallow: /*?ref*
Disallow: /*?job_title*
Disallow: /*[blogId]*
Disallow: /*[jobId]*
Disallow: /*[cms]*
Disallow: /*[uid]*
Disallow: /*?page*
Disallow: /*?gclid*
Disallow: /blog
Disallow: /blog/*
Disallow: /*/vacancy/*
Disallow: /ai-interviewer
Disallow: /ai-interviewer/*
```

## Interpretare

| Cale | Accesibil? | Ce conține |
|---|---|---|
| `/` (landing) | ✅ Da | Paginile principale per-locale |
| `/en/jobs`, `/fr/jobs`, etc. | ✅ Da | Listări de job-uri (front-end) |
| `/api/*` | ❌ **Disallowed** | API-ul JSON — scraperul NU îl folosește (folosește Chromium headless) |
| `/*/vacancy/*` | ❌ **Disallowed** | Paginile individuale de job |
| `/en/application` | ❌ Disallowed | Pagina de aplicare |
| `/blog/*` | ❌ Disallowed | Blogul |
| `/ai-interviewer/*` | ❌ Disallowed | Intervievator AI |

## Recomandare

robots.txt NU este legal binding, dar reprezintă intenția proprietarului site-ului.

- API-ul `/api/jobs/v2/search/...` e **disallowed** de robots.txt. Scraperul NU îl folosește — folosește Chromium headless pentru a renderiza pagina `/en/jobs` (care e allowed) și a extrage DOM-ul cu job-uri.
- Paginile individuale de job (`/en/vacancy/...`) sunt și ele disallowed. Noi nu le scraper-uim direct — doar le verificăm accesibilitatea (HEAD request) în E2E tests.
- Dacă se dorește conformare strictă, Chromium headless renderizează pagina permisă `/en/jobs` — alternativă complet conformă.
- Scraperul face o singură cerere Chromium per rulare — comportament rezonabil, nu agresiv.

**Concluzie**: Risc minim. Chromium renderizează o singură pagină permisă de robots.txt, scraperul e politicos (User-Agent identificabil, o singură cerere).
