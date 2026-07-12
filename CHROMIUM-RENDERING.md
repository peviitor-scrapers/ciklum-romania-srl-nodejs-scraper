# Chromium Headless SPA Rendering

## Problem

Ciklum careers page is an Oracle HCM SPA. Jobs are loaded via JavaScript after the initial HTML load. `--dump-dom` captures the DOM immediately, before JS finishes rendering — resulting in **0 jobs found**.

## Solution

Use `--virtual-time-budget` to give Chromium time to execute JS before dumping the DOM:

```bash
chromium --headless=new --disable-gpu --no-sandbox \
  --dump-dom --virtual-time-budget=10000 \
  'https://explore-jobs.ciklum.com/en/sites/ciklum-career/jobs?lastSelectedFacet=LOCATIONS&selectedLocationsFacet=300000000468495'
```

| Flag | Purpose |
|------|---------|
| `--headless=new` | New headless mode (not the old `--headless`) |
| `--dump-dom` | Print final DOM to stdout |
| `--virtual-time-budget=10000` | Fast-forward 10s of virtual time — lets JS fetch + render jobs |
| `--no-sandbox` | Required in CI (no display server) |

**Without** `--virtual-time-budget`: 0 jobs (DOM captured before API response returns).
**With** `--virtual-time-budget=10000`: 23 jobs (API response received, DOM fully rendered).

## Why not use the Oracle HCM REST API directly?

The API at `ialmme.fa.ocs.oraclecloud.com/hcmRestApi/CandidateExperience/recruitingCEJobRequisitions` returns `content-length: 0` without proper session cookies. The `ora-irc-cx-userid` UUID alone isn't enough — the API likely requires a server-side session established by the SPA's initial load.

Rendering the full page with Chromium sidesteps this: it establishes the session, loads the SPA, and we parse the rendered DOM.
