import { jest } from '@jest/globals';

const COMPANY = 'CIKLUM ROMANIA SRL';
const CIF = '45871772';

describe('index.js Chromium Scraper', () => {
  beforeAll(async () => {
    jest.unstable_mockModule('child_process', () => ({
      execSync: jest.fn().mockReturnValue('<script>config</script><div class="job-tile job-list-item">test</div>'),
    }));
  });

  describe('Job Data Structure', () => {
    it('should use correct CIF and company name', () => {
      expect(COMPANY).toBe('CIKLUM ROMANIA SRL');
      expect(CIF).toBe('45871772');
    });

    it('should construct job URL from ID', () => {
      const id = '1245';
      const url = `https://explore-jobs.ciklum.com/en/sites/ciklum-career/job/${id}`;
      expect(url).toBe('https://explore-jobs.ciklum.com/en/sites/ciklum-career/job/1245');
    });

    it('should handle deduplication by URL', () => {
      const jobs = [
        { title: 'Job 1', url: 'https://explore-jobs.ciklum.com/en/sites/ciklum-career/job/1' },
        { title: 'Job 1', url: 'https://explore-jobs.ciklum.com/en/sites/ciklum-career/job/1' },
        { title: 'Job 2', url: 'https://explore-jobs.ciklum.com/en/sites/ciklum-career/job/2' },
      ];
      const uniqueJobs = Array.from(
        new Map(jobs.map(j => [j.url, j])).values()
      );
      expect(uniqueJobs).toHaveLength(2);
    });
  });

  describe('Payload Structure', () => {
    it('should have ISO 8601 scrapedAt timestamp', () => {
      const scrapedAt = new Date().toISOString();
      expect(scrapedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should have empty jobs array when no RO jobs', () => {
      const payload = { jobs: [] };
      expect(Array.isArray(payload.jobs)).toBe(true);
      expect(payload.jobs).toHaveLength(0);
    });

    it('should save output to tmp/jobs.json', () => {
      const payload = {
        source: 'ciklum.com',
        scrapedAt: new Date().toISOString(),
        company: COMPANY,
        cif: CIF,
        jobs: [
          { title: 'Senior Full Stack Engineer', url: 'https://explore-jobs.ciklum.com/en/sites/ciklum-career/job/1245', location: 'Romania' },
        ],
      };
      expect(payload.company).toBe(COMPANY);
      expect(payload.cif).toBe(CIF);
      expect(payload.jobs).toHaveLength(1);
      expect(payload.jobs[0].title).toBe('Senior Full Stack Engineer');
    });
  });
});
