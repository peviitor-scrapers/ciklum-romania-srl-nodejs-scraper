import { jest } from '@jest/globals';

const TIMEOUT = 60000;

describe('E2E: Full Scraping Pipeline', () => {
  describe('Ciklum Careers — Chromium Render + Parse', () => {
    let index;

    beforeAll(async () => {
      index = await import('../../index.js');
    }, TIMEOUT);

    it('should render page and extract jobs via Chromium', async () => {
      const { execSync } = await import('child_process');
      const url = 'https://explore-jobs.ciklum.com/en/sites/ciklum-career/jobs?lastSelectedFacet=LOCATIONS&selectedLocationsFacet=300000000468495';

      const html = execSync(
        `chromium --headless=new --disable-gpu --no-sandbox --dump-dom --virtual-time-budget=10000 '${url}'`,
        { timeout: 60000, encoding: 'utf-8' }
      );

      expect(html).toBeDefined();
      expect(html.length).toBeGreaterThan(0);
    }, TIMEOUT);

    it('should parse jobs from rendered HTML', async () => {
      const { execSync } = await import('child_process');
      const url = 'https://explore-jobs.ciklum.com/en/sites/ciklum-career/jobs?lastSelectedFacet=LOCATIONS&selectedLocationsFacet=300000000468495';

      const html = execSync(
        `chromium --headless=new --disable-gpu --no-sandbox --dump-dom --virtual-time-budget=10000 '${url}'`,
        { timeout: 60000, encoding: 'utf-8' }
      );

      const result = index.parseApiJobs(html);
      expect(result.jobs.length).toBeGreaterThan(0);

      const job = result.jobs[0];
      expect(job).toHaveProperty('title');
      expect(job).toHaveProperty('url');
      expect(job.url).toContain('explore-jobs.ciklum.com');
    }, TIMEOUT);

    it('should have Romanian jobs with expected fields', async () => {
      const { execSync } = await import('child_process');
      const url = 'https://explore-jobs.ciklum.com/en/sites/ciklum-career/jobs?lastSelectedFacet=LOCATIONS&selectedLocationsFacet=300000000468495';

      const html = execSync(
        `chromium --headless=new --disable-gpu --no-sandbox --dump-dom --virtual-time-budget=10000 '${url}'`,
        { timeout: 60000, encoding: 'utf-8' }
      );

      const result = index.parseApiJobs(html);
      for (const job of result.jobs) {
        expect(job.title).toBeTruthy();
        expect(job.url).toMatch(/^https?:\/\//);
      }
    }, TIMEOUT);

    it('should map parsed jobs to job model', async () => {
      const { execSync } = await import('child_process');
      const url = 'https://explore-jobs.ciklum.com/en/sites/ciklum-career/jobs?lastSelectedFacet=LOCATIONS&selectedLocationsFacet=300000000468495';

      const html = execSync(
        `chromium --headless=new --disable-gpu --no-sandbox --dump-dom --virtual-time-budget=10000 '${url}'`,
        { timeout: 60000, encoding: 'utf-8' }
      );

      const result = index.parseApiJobs(html);
      const jobModel = index.mapToJobModel(result.jobs[0], '45871772', 'CIKLUM ROMANIA SRL');

      expect(jobModel).toHaveProperty('url');
      expect(jobModel).toHaveProperty('title');
      expect(jobModel).toHaveProperty('company', 'CIKLUM ROMANIA SRL');
      expect(jobModel).toHaveProperty('cif', '45871772');
      expect(jobModel).toHaveProperty('status', 'scraped');
    }, TIMEOUT);

    it('should transform jobs and filter to Romanian locations', async () => {
      const payload = {
        company: 'CIKLUM ROMANIA SRL',
        cif: '45871772',
        jobs: [
          { url: 'https://test.com/1', title: 'Job 1', location: ['București'], workmode: 'remote' },
          { url: 'https://test.com/2', title: 'Job 2', location: ['London'], workmode: 'hybrid' },
        ]
      };

      const result = index.transformJobsForSOLR(payload);
      expect(result.company).toBe('CIKLUM ROMANIA SRL');
      expect(result.jobs[0].location).toEqual(['București']);
      expect(result.jobs[0].workmode).toBe('remote');
    });
  });

  describe('Company Validation Path', () => {
    const itIfSolr = process.env.SOLR_AUTH ? it : it.skip;

    itIfSolr('should find Ciklum in ANAF and validate active status', async () => {
      const company = await import('../../company.js');
      const result = await company.validateAndGetCompany();
      expect(result).toHaveProperty('company', 'CIKLUM ROMANIA SRL');
      expect(result).toHaveProperty('cif', '45871772');
      expect(result).toHaveProperty('status', 'active');
    }, TIMEOUT);
  });
});
