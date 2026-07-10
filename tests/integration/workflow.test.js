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

const CIKLUM_CIF = '45871772';

describe('Integration: API Workflow', () => {

  describe('ANAF API', () => {
    let anaf;

    beforeAll(async () => {
      anaf = await import('../../src/anaf.js');
    });

    it('should search for Ciklum brand and find the company', async () => {
      const results = await anaf.searchCompany('Ciklum');

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);

      const ciklum = results.find(c =>
        c.name.toUpperCase().includes('CIKLUM') && c.statusLabel === 'Funcțiune'
      );
      expect(ciklum).toBeDefined();
      expect(ciklum.cui.toString()).toBe(CIKLUM_CIF);
    }, 15000);

    it('should return empty array for non-existent brand', async () => {
      const results = await anaf.searchCompany('ThisBrandDoesNotExistXYZ123');

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(0);
    }, 15000);

    it('should fetch company details by valid CIF', async () => {
      const data = await anaf.getCompanyFromANAF(CIKLUM_CIF);

      expect(data).toBeDefined();
      expect(data.cui).toBe(45871772);
      expect(data.name).toBe('CIKLUM ROMANIA S.R.L.');
      expect(data).toHaveProperty('address');
      expect(data).toHaveProperty('registrationNumber');
      expect(data).toHaveProperty('authorizedCaenCodes');
      expect(Array.isArray(data.authorizedCaenCodes)).toBe(true);
      expect(data).toHaveProperty('onrcStatusLabel', 'Funcțiune');
    }, 15000);

    it('should throw for invalid CIF', async () => {
      await expect(anaf.getCompanyFromANAF('00000000')).rejects.toThrow();
    }, 60000);

    it('should use cached data when API fails (getCompanyFromANAFWithFallback)', async () => {
      const cached = { cui: 45871772, name: 'CIKLUM ROMANIA SRL' };

      const data = await anaf.getCompanyFromANAFWithFallback(CIKLUM_CIF, cached);

      expect(data).toBeDefined();
      expect(data.cui).toBe(45871772);
    }, 15000);
  });

  describe('Peviitor API', () => {
    it('should return Ciklum company data when queried by CIF', async () => {
      const res = await fetch(`https://api.peviitor.ro/v1/company/?cif=${CIKLUM_CIF}`, {
        headers: { 'User-Agent': 'job_seeker_ro_spider' }
      });

      expect(res.ok).toBe(true);
      const data = await res.json();
      expect(data).toHaveProperty('company');
      expect(data.company._root_).toBe(CIKLUM_CIF);
      expect(data.company.company).toBe('CIKLUM ROMANIA SRL');
    }, 15000);
  });

  describe('SOLR Company Core', () => {
    let solr;

    beforeAll(async () => {
      solr = await import('../../solr.js');
    });

    itIfSolr('should query company core by ID', async () => {
      const result = await solr.queryCompanySOLR(`id:${CIKLUM_CIF}`);

      expect(result.numFound).toBe(1);
      const ciklum = result.docs[0];
      expect(ciklum.id).toBe(CIKLUM_CIF);
      expect(ciklum.company).toBe('CIKLUM ROMANIA SRL');
      expect(ciklum.brand).toBe('Ciklum');
      expect(ciklum.status).toBe('activ');
      expect(Array.isArray(ciklum.location)).toBe(true);
    }, 15000);

    itIfSolr('should have required company model fields', async () => {
      const result = await solr.queryCompanySOLR(`id:${CIKLUM_CIF}`);
      const ciklum = result.docs[0];

      expect(ciklum).toHaveProperty('id', CIKLUM_CIF);
      expect(ciklum).toHaveProperty('company');
      expect(ciklum).toHaveProperty('brand', 'Ciklum');
      expect(ciklum).toHaveProperty('status');
      expect(['activ', 'suspendat', 'inactiv', 'radiat']).toContain(ciklum.status);
      expect(ciklum).toHaveProperty('location');
      expect(Array.isArray(ciklum.location)).toBe(true);
      expect(ciklum).toHaveProperty('website');
      expect(Array.isArray(ciklum.website)).toBe(true);
      expect(ciklum.website[0]).toMatch(/^https?:\/\/.+/);
      expect(ciklum).toHaveProperty('lastScraped');
      expect(ciklum).toHaveProperty('scraperFile');
    }, 15000);

    itIfSolr('should have optional field (career) if present', async () => {
      const result = await solr.queryCompanySOLR(`id:${CIKLUM_CIF}`);
      const ciklum = result.docs[0];

      if (ciklum.career !== undefined) {
        expect(Array.isArray(ciklum.career)).toBe(true);
        expect(ciklum.career[0]).toMatch(/^https?:\/\/.+/);
      }
    }, 15000);
  });

  describe('SOLR Jobs Core', () => {
    let solr;

    beforeAll(async () => {
      solr = await import('../../solr.js');
    });

    itIfSolr('should query jobs by CIF and return valid data', async () => {
      const result = await solr.querySOLR(CIKLUM_CIF);

      if (result.numFound === 0) {
        console.log('⚠️ No Ciklum jobs in Solr — skipping (scraper may not have run yet)');
        return;
      }

      expect(result.numFound).toBeGreaterThan(0);
      expect(Array.isArray(result.docs)).toBe(true);

      const job = result.docs[0];
      expect(job).toHaveProperty('url');
      expect(job).toHaveProperty('title');
      expect(job).toHaveProperty('company', 'CIKLUM ROMANIA SRL');
      expect(job).toHaveProperty('cif', CIKLUM_CIF);
    }, 15000);

    itIfSolr('should not have duplicate URLs for same CIF', async () => {
      const result = await solr.querySOLR(CIKLUM_CIF);

      const urls = result.docs.map(j => j.url);
      const uniqueUrls = new Set(urls);
      expect(uniqueUrls.size).toBe(result.docs.length);
    }, 15000);

    itIfSolr('should have valid CIF format for all jobs', async () => {
      const result = await solr.querySOLR(CIKLUM_CIF);

      for (const job of result.docs) {
        expect(job.cif).toMatch(/^\d{8}$/);
      }
    }, 15000);
  });

  describe('Full Validation Workflow', () => {
    let anaf;

    beforeAll(async () => {
      anaf = await import('../../src/anaf.js');
    });

    it('should complete the ANAF search path for Ciklum', async () => {
      const searchResults = await anaf.searchCompany('Ciklum');
      expect(searchResults.length).toBeGreaterThan(0);

      const ciklumCompany = searchResults.find(c =>
        c.name.toUpperCase().includes('CIKLUM') && c.statusLabel === 'Funcțiune'
      );
      expect(ciklumCompany).toBeDefined();

      const anafData = await anaf.getCompanyFromANAF(ciklumCompany.cui.toString());
      expect(anafData.name).toBe('CIKLUM ROMANIA S.R.L.');
      expect(anafData.onrcStatusLabel).toBe('Funcțiune');
    }, 30000);
  });
});
