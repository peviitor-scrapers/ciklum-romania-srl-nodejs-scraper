import { jest } from '@jest/globals';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

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
const CIKLUM_CAREERS_URL = 'https://explore-jobs.ciklum.com/en/sites/ciklum-career/jobs?lastSelectedFacet=LOCATIONS&selectedLocationsFacet=300000000468495';

describe('E2E: Full Scraping Pipeline', () => {

  describe('Ciklum Careers Page — Real Data Fetch', () => {
    let html;
    let status;

    beforeAll(async () => {
      const res = await fetch(CIKLUM_CAREERS_URL, {
        headers: {
          'User-Agent': 'job_seeker_ro_spider',
          'Accept-Language': 'en-US,en;q=0.9',
        }
      });
      status = res.status;
      html = await res.text();
    }, 30000);

    it('should respond with 200 OK', () => {
      expect(status).toBe(200);
    });

    it('should return HTML content', () => {
      expect(html.length).toBeGreaterThan(0);
      expect(html.includes('ciklum') || html.includes('Ciklum')).toBe(true);
    }, 10000);

    it('should contain job listing links', () => {
      const jobLinks = html.match(/\/en\/sites\/ciklum-career\/job\//g);
      expect(jobLinks).not.toBeNull();
      expect(jobLinks.length).toBeGreaterThan(0);
    });
  });

  describe('Job Extraction', () => {
    let html;
    let cheerioMod;

    beforeAll(async () => {
      const res = await fetch(CIKLUM_CAREERS_URL, {
        headers: {
          'User-Agent': 'job_seeker_ro_spider',
          'Accept-Language': 'en-US,en;q=0.9',
        }
      });
      html = await res.text();
      cheerioMod = await import('cheerio');
    }, 30000);

    it('should extract job titles and URLs from page', () => {
      const $ = cheerioMod.load(html);
      const jobs = [];

      $('a[href*="/en/sites/ciklum-career/job/"]').each((_, el) => {
        const a = $(el);
        const href = a.attr('href');
        const text = a.text().replace(/\s+/g, ' ').trim();
        const title = text.split(' Locations ')[0].trim();

        if (title && href) {
          const fullUrl = href.startsWith('http') ? href : `https://explore-jobs.ciklum.com${href}`;
          jobs.push({ title, url: fullUrl });
        }
      });

      expect(jobs.length).toBeGreaterThan(0);
      for (const job of jobs) {
        expect(job.title).toBeTruthy();
        expect(job.url).toMatch(/^https:\/\/explore-jobs\.ciklum\.com\//);
      }
    });

    it('should extract posting dates from job listings', () => {
      const $ = cheerioMod.load(html);
      let foundDate = false;

      $('a[href*="/en/sites/ciklum-career/job/"]').each((_, el) => {
        const text = $(el).text().replace(/\s+/g, ' ').trim();
        const postingMatch = text.match(/Posting Date\s+(\d{2}\/\d{2}\/\d{4})/);
        if (postingMatch) {
          foundDate = true;
        }
      });

      expect(foundDate).toBe(true);
    });

    it('should deduplicate extracted jobs by URL', () => {
      const $ = cheerioMod.load(html);
      const jobs = [];

      $('a[href*="/en/sites/ciklum-career/job/"]').each((_, el) => {
        const a = $(el);
        const href = a.attr('href');
        const text = a.text().replace(/\s+/g, ' ').trim();
        const title = text.split(' Locations ')[0].trim();

        if (title && href) {
          const fullUrl = href.startsWith('http') ? href : `https://explore-jobs.ciklum.com${fullUrl}`;
          jobs.push({ title, url: fullUrl });
        }
      });

      const uniqueJobs = Array.from(new Map(jobs.map(j => [j.url, j])).values());
      expect(uniqueJobs.length).toBeGreaterThan(0);
      expect(uniqueJobs.length).toBeLessThanOrEqual(jobs.length);
    });
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
      expect(result.company).toBe('CIKLUM ROMANIA SRL');
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
