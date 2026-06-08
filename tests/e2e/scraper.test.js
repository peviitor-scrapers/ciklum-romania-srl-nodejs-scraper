import { jest } from '@jest/globals';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

const HAS_SOLR = !!process.env.SOLR_AUTH;

function itIfSolr(name, fn, timeout) {
  if (HAS_SOLR) {
    return it(name, fn, timeout);
  }
  return it.skip(`${name} (skipped: SOLR_AUTH not set)`, fn, timeout);
}

beforeAll(() => {
  if (HAS_SOLR) {
    process.env.SOLR_AUTH = process.env.SOLR_AUTH;
  }
});

const TEST_CIF = '45871772';
const TEST_BRAND = 'Ciklum';
const API_URL = 'https://ialmme.fa.ocs.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitions';
const ORIGIN = 'https://explore-jobs.ciklum.com';

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

describe('E2E: Full Scraping Pipeline', () => {

  describe('Oracle HCM API — Real Data Fetch', () => {
    let data;

    beforeAll(async () => {
      const params = new URLSearchParams({
        onlyData: 'true',
        finder: 'findReqs;siteNumber=CX_1001',
        limit: '25',
        expand: 'requisitionList',
      });

      const res = await fetch(`${API_URL}?${params}`, {
        headers: {
          'User-Agent': 'job_seeker_ro_spider',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept': 'application/json, text/plain, */*',
          'ora-irc-cx-userid': uuid(),
          'ora-irc-language': 'en',
          'Content-Type': 'application/vnd.oracle.adf.resourceitem+json;charset=utf-8',
          'Origin': ORIGIN,
          'Referer': `${ORIGIN}/en/sites/ciklum-career/jobs`,
        },
      });
      expect(res.status).toBe(200);
      data = await res.json();
    }, 30000);

    it('should respond with valid JSON and contain items', () => {
      expect(data).toBeDefined();
      expect(data.items).toBeDefined();
      expect(data.items.length).toBeGreaterThan(0);
    });

    it('should have TotalJobsCount', () => {
      expect(data.items[0].TotalJobsCount).toBeGreaterThan(0);
    });

    it('should contain Romanian jobs in requisitionList', () => {
      const list = data.items[0].requisitionList;
      expect(Array.isArray(list)).toBe(true);
      expect(list.length).toBeGreaterThan(0);

      const roJobs = list.filter(j => j.PrimaryLocationCountry === 'RO');
      expect(roJobs.length).toBeGreaterThan(0);
    });
  });

  describe('Job Extraction from API', () => {
    let roJobs;

    beforeAll(async () => {
      const params = new URLSearchParams({
        onlyData: 'true',
        finder: 'findReqs;siteNumber=CX_1001',
        limit: '25',
        expand: 'requisitionList',
      });

      const res = await fetch(`${API_URL}?${params}`, {
        headers: {
          'User-Agent': 'job_seeker_ro_spider',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept': 'application/json, text/plain, */*',
          'ora-irc-cx-userid': uuid(),
          'ora-irc-language': 'en',
          'Content-Type': 'application/vnd.oracle.adf.resourceitem+json;charset=utf-8',
          'Origin': ORIGIN,
          'Referer': `${ORIGIN}/en/sites/ciklum-career/jobs`,
        },
      });
      const data = await res.json();
      roJobs = data.items[0].requisitionList.filter(j => j.PrimaryLocationCountry === 'RO');
    }, 30000);

    it('should extract job titles from API response', () => {
      expect(roJobs.length).toBeGreaterThan(0);
      for (const job of roJobs) {
        expect(job.Title).toBeTruthy();
      }
    });

    it('should extract posting dates from API response', () => {
      for (const job of roJobs) {
        expect(job.PostedDate).toBeTruthy();
        expect(job.PostedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    });

    it('should construct valid job URLs from IDs', () => {
      for (const job of roJobs) {
        const url = `https://explore-jobs.ciklum.com/en/sites/ciklum-career/job/${job.Id}`;
        expect(url).toMatch(/^https:\/\/explore-jobs\.ciklum\.com\/en\/sites\/ciklum-career\/job\/\d+$/);
      }
    });

    it('should have no duplicate job IDs', () => {
      const ids = roJobs.map(j => j.Id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should verify at least one job URL is accessible', async () => {
      const jobsToCheck = roJobs.slice(0, 3);

      for (const job of jobsToCheck) {
        const url = `https://explore-jobs.ciklum.com/en/sites/ciklum-career/job/${job.Id}`;
        const res = await fetch(url, {
          method: 'HEAD',
          headers: { 'User-Agent': 'job_seeker_ro_spider' },
        });
        expect(res.status).toBe(200);
      }
    }, 30000);
  });

  describe('Company Validation Path', () => {
    let anaf;

    beforeAll(async () => {
      anaf = await import('../../src/anaf.js');
    });

    it('should find Ciklum in ANAF and validate active status', async () => {
      const results = await anaf.searchCompany(TEST_BRAND);

      const ciklum = results.find(c =>
        c.name.toUpperCase().includes('CIKLUM') &&
        c.statusLabel === 'Funcțiune'
      );
      expect(ciklum).toBeDefined();
      expect(ciklum.cui.toString()).toBe(TEST_CIF);

      const anafData = await anaf.getCompanyFromANAF(TEST_CIF);
      expect(anafData).toBeDefined();
      expect(anafData.inactive).toBe(false);
    }, 30000);

    itIfSolr('should run full validation and report active status', async () => {
      const company = await import('../../company.js');
      const result = await company.validateAndGetCompany();

      expect(result.status).toBe('active');
      expect(result.company).toBe('CIKLUM ROMANIA S.R.L.');
      expect(result.cif).toBe(TEST_CIF);
    }, 30000);
  });

  describe('SOLR Data Verification', () => {
    let solr;

    beforeAll(async () => {
      solr = await import('../../solr.js');
    });

    itIfSolr('should have Ciklum company core entry with required fields', async () => {
      const result = await solr.queryCompanySOLR(`id:${TEST_CIF}`);

      expect(result.numFound).toBe(1);
      const ciklum = result.docs[0];
      expect(ciklum.company).toBe('CIKLUM ROMANIA SRL');
      expect(ciklum.status).toBe('activ');
    }, 15000);
  });
});
