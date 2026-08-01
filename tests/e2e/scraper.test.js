import { jest } from '@jest/globals';
import { execSync } from 'child_process';
import fetch from 'node-fetch';

const API_BASE = 'https://api.peviitor.ro/v1';
const COMPANY_CIF = '45871772';

let HAS_API = false;
let HAS_ANAF = false;

function hasBrowser() {
  const candidates = [
    process.env.CHROMIUM_BIN,
    'google-chrome-stable',
    'google-chrome',
    'chromium',
    'chromium-browser'
  ].filter(Boolean);
  for (const bin of candidates) {
    try {
      execSync(`command -v ${bin}`, { encoding: 'utf-8' });
      return true;
    } catch {
      // try next candidate
    }
  }
  return false;
}

async function checkApiAvailability() {
  try {
    const res = await fetch(`${API_BASE}/scraper/jobs/?cif=${COMPANY_CIF}&rows=1`, {
      signal: AbortSignal.timeout(5000)
    });
    return res.ok || res.status === 400;
  } catch {
    return false;
  }
}

async function checkAnafAvailability() {
  try {
    const res = await fetch('https://demoanaf.ro/api/search?q=test', {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000)
    });
    return res.ok;
  } catch {
    return false;
  }
}

function itIfApi(name, fn, timeout) {
  if (HAS_API) {
    return it(name, fn, timeout);
  }
  return it.skip(`${name} (skipped: API unavailable)`, fn, timeout);
}

function itIfAnaf(name, fn, timeout) {
  if (HAS_ANAF) {
    return it(name, fn, timeout);
  }
  return it.skip(`${name} (skipped: ANAF API unavailable)`, fn, timeout);
}

import companyConfig from '../../scraper/config/company.js';
const TEST_CIF = companyConfig.id;
const TEST_BRAND = companyConfig.brand;
const COMPANY_NAME = companyConfig.company;
const CAREER_URL = companyConfig.career[0];

[HAS_API, HAS_ANAF] = await Promise.all([checkApiAvailability(), checkAnafAvailability()]);

describe('E2E: Full Scraping Pipeline', () => {

  describe('Ciklum Careers Page — Real Data Fetch', () => {
    let index;

    beforeAll(async () => {
      index = await import('../../scraper/index.js');
      jest.setTimeout(120000);
    }, 120000);

    const maybeIt = hasBrowser() ? it : it.skip;

    maybeIt('should render the Oracle HCM careers page with Chromium', async () => {
      const html = index.renderPage(`${CAREER_URL}/en/sites/ciklum-career/jobs`);
      expect(html.length).toBeGreaterThan(0);
    }, 120000);

    maybeIt('should render the Romania-filtered job list', async () => {
      const html = index.renderPage(`${CAREER_URL}/en/sites/ciklum-career/jobs?lastSelectedFacet=LOCATIONS&selectedLocationsFacet=300000000468495`);
      expect(html).toContain('job-tile');
    }, 120000);
  });

  describe('Parse Pipeline', () => {
    let index;

    beforeAll(async () => {
      index = await import('../../scraper/index.js');
      jest.setTimeout(120000);
    }, 120000);

    const maybeIt = hasBrowser() ? it : it.skip;

    maybeIt('should parse real rendered careers page HTML into job listings', async () => {
      const html = index.renderPage(`${CAREER_URL}/en/sites/ciklum-career/jobs?lastSelectedFacet=LOCATIONS&selectedLocationsFacet=300000000468495`);
      const result = index.parseApiJobs(html);

      expect(Array.isArray(result.jobs)).toBe(true);
      expect(result.jobs.length).toBeGreaterThan(0);

      const job = result.jobs[0];
      expect(job).toHaveProperty('url');
      expect(job.url).toContain('explore-jobs.ciklum.com');
      expect(job).toHaveProperty('title');
    }, 120000);

    maybeIt('should map parsed jobs to job model', async () => {
      const html = index.renderPage(`${CAREER_URL}/en/sites/ciklum-career/jobs?lastSelectedFacet=LOCATIONS&selectedLocationsFacet=300000000468495`);
      const result = index.parseApiJobs(html);
      const model = index.mapToJobModel(result.jobs[0], TEST_CIF);

      expect(model).toHaveProperty('url');
      expect(model).toHaveProperty('title');
      expect(model).toHaveProperty('company');
      expect(model).toHaveProperty('cif', TEST_CIF);
      expect(model).toHaveProperty('status', 'scraped');
      expect(model).toHaveProperty('date');
    }, 120000);

    maybeIt('should produce valid job URLs that are accessible', async () => {
      const html = index.renderPage(`${CAREER_URL}/en/sites/ciklum-career/jobs?lastSelectedFacet=LOCATIONS&selectedLocationsFacet=300000000468495`);
      const result = index.parseApiJobs(html);

      for (const job of result.jobs.slice(0, 2)) {
        const jobRes = await fetch(job.url, {
          method: 'HEAD',
          headers: { 'User-Agent': 'job_seeker_ro_spider' }
        });
        expect(jobRes.ok).toBe(true);
      }
    }, 120000);
  });

  describe('Company Validation Path', () => {
    let anaf;
    let company;

    beforeAll(async () => {
      anaf = await import('../../scraper/anaf.js');
      company = await import('../../scraper/company.js');
    }, 60000);

    itIfAnaf('should find Ciklum in ANAF and validate active status', async () => {
      const results = await anaf.searchCompany(TEST_BRAND);

      const target = results.find(c =>
        c.cui.toString() === TEST_CIF &&
        c.statusLabel === 'Funcțiune'
      );
      expect(target).toBeDefined();
      expect(target.cui.toString()).toBe(TEST_CIF);

      const anafData = await anaf.getCompanyFromANAF(TEST_CIF);
      expect(anafData).toBeDefined();
      expect(anafData.inactive).toBe(false);
    }, 30000);

    itIfApi('should run full validation and report active status with job count', async () => {
      const result = await company.validateAndGetCompany();

      expect(result.status).toBe('active');
      expect(result.company).toBe(COMPANY_NAME);
      expect(result.cif).toBe(TEST_CIF);

      if (result.existingJobsCount === 0) {
        console.log('⚠️ No Ciklum jobs — skipping job count assertion');
        return;
      }
      expect(result.existingJobsCount).toBeGreaterThan(0);
    }, 30000);
  });

  describe('Inactive Company Handling', () => {
    let anaf;

    beforeAll(async () => {
      anaf = await import('../../scraper/anaf.js');
    });

    itIfAnaf('should detect inactive/radiated companies via ANAF', async () => {
      const results = await anaf.searchCompany(TEST_BRAND);

      const nonActive = results.find(c => c.statusLabel !== 'Funcțiune');

      if (nonActive) {
        try {
          const anafData = await anaf.getCompanyFromANAF(nonActive.cui.toString());
          expect(anafData).toBeDefined();
          if (anafData.inactive !== undefined) {
            expect(anafData.inactive).toBe(true);
          }
        } catch {
          expect(nonActive.statusLabel).toMatch(/Radiată|Inactiv|Suspendat/);
        }
      }
    }, 30000);
  });

  describe('Data Verification', () => {
    let api;

    beforeAll(async () => {
      api = await import('../../scraper/api.js');
    });

    itIfApi('should have Ciklum jobs with correct company name', async () => {
      const result = await api.querySOLR(TEST_CIF);

      if (result.numFound === 0) {
        console.log('⚠️ No Ciklum jobs — skipping data verification');
        return;
      }

      for (const job of result.docs) {
        expect(job.company).toBe(COMPANY_NAME);
        expect(job.cif).toBe(TEST_CIF);
      }
    }, 15000);

    itIfApi('should have Ciklum company core entry with required fields', async () => {
      const companyDoc = await api.getCompanyByCif(TEST_CIF);

      expect(companyDoc).toBeDefined();
      expect(companyDoc.company).toBe(COMPANY_NAME);
      expect(companyDoc.status).toBe('activ');
    }, 15000);
  });
});
