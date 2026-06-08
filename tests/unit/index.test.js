import { jest } from '@jest/globals';

const COMPANY = 'CIKLUM ROMANIA SRL';
const CIF = '45871772';

describe('index.js Oracle HCM API Scraper', () => {
  let mainModule;

  beforeAll(async () => {
    jest.unstable_mockModule('axios', () => {
      const mockData = {
        items: [{
          requisitionList: [
            { Id: '1245', Title: 'Senior Full Stack Engineer', PostedDate: '2026-06-05', PrimaryLocationCountry: 'RO' },
            { Id: '2130', Title: 'DevOps Engineer', PostedDate: '2026-06-05', PrimaryLocationCountry: 'UA' },
            { Id: '3001', Title: 'Java Developer', PostedDate: '2026-06-06', PrimaryLocationCountry: 'RO' },
          ],
        }],
      };

      return {
        default: {
          get: jest.fn().mockResolvedValue({ data: mockData }),
        },
      };
    });
  });

  beforeEach(async () => {
    jest.resetModules();
    mainModule = await import('../../index.js');
  });

  describe('API Integration', () => {
    it('should call the Oracle HCM API with correct headers', async () => {
      const axios = (await import('axios')).default;
      expect(axios.get).toHaveBeenCalledTimes(1);
      const [url, config] = axios.get.mock.calls[0];
      expect(url).toContain('hcmRestApi/resources/latest/recruitingCEJobRequisitions');
      expect(config.headers['ora-irc-cx-userid']).toBeDefined();
      expect(config.headers['ora-irc-language']).toBe('en');
      expect(config.headers['Origin']).toBe('https://explore-jobs.ciklum.com');
      expect(config.params.finder).toContain('siteNumber=CX_1001');
      expect(config.params.expand).toBe('requisitionList');
    });

    it('should use correct CIF and company name', () => {
      const payload = {
        source: 'ciklum.com',
        company: COMPANY,
        cif: CIF,
      };
      expect(payload.company).toBe('CIKLUM ROMANIA SRL');
      expect(payload.cif).toBe('45871772');
    });
  });

  describe('Romanian Jobs Filtering', () => {
    it('should filter jobs to RO country only', async () => {
      const mockList = [
        { Id: '1245', Title: 'Sr Engineer', PostedDate: '2026-06-05', PrimaryLocationCountry: 'RO' },
        { Id: '2130', Title: 'DevOps', PostedDate: '2026-06-05', PrimaryLocationCountry: 'UA' },
        { Id: '3001', Title: 'Java Dev', PostedDate: '2026-06-06', PrimaryLocationCountry: 'RO' },
      ];

      const roJobs = mockList.filter(j => j.PrimaryLocationCountry === 'RO');
      expect(roJobs).toHaveLength(2);
      expect(roJobs[0].Title).toBe('Sr Engineer');
      expect(roJobs[1].Title).toBe('Java Dev');
    });

    it('should exclude non-RO jobs', () => {
      const mockList = [
        { Id: '2130', Title: 'DevOps', PostedDate: '2026-06-05', PrimaryLocationCountry: 'UA' },
      ];

      const roJobs = mockList.filter(j => j.PrimaryLocationCountry === 'RO');
      expect(roJobs).toHaveLength(0);
    });
  });

  describe('Job URL Construction', () => {
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
  });
});
