import { jest } from '@jest/globals';

let index;

beforeAll(async () => {
  index = await import('../../index.js');
});

const COMPANY_NAME = 'CIKLUM ROMANIA SRL';
const COMPANY_CIF = '45871772';

describe('index.js Component Tests', () => {
  describe('transformJobsForSOLR', () => {
    it('should filter locations to only Romanian cities', () => {
      const payload = {
        company: COMPANY_NAME,
        jobs: [
          { url: 'https://test.com/1', title: 'Job 1', location: ['București'] },
          { url: 'https://test.com/2', title: 'Job 2', location: ['London'] },
        ]
      };

      const result = index.transformJobsForSOLR(payload);

      expect(result.jobs[0].location).toEqual(['București']);
      expect(result.jobs[1].location).toEqual(['România']);
    });

    it('should keep company uppercase', () => {
      const payload = {
        company: COMPANY_NAME,
        jobs: [
          { url: 'https://test.com/1', title: 'Job 1', location: ['București'] },
        ]
      };

      const result = index.transformJobsForSOLR(payload);

      expect(result.company).toBe('CIKLUM ROMANIA SRL');
    });

    it('should normalize workmode values', () => {
      const payload = {
        company: COMPANY_NAME,
        jobs: [
          { url: 'https://test.com/1', title: 'Job 1', location: ['București'], workmode: 'Remote' },
          { url: 'https://test.com/2', title: 'Job 2', location: ['Cluj-Napoca'], workmode: 'Office' },
        ]
      };

      const result = index.transformJobsForSOLR(payload);

      expect(result.jobs[0].workmode).toBe('remote');
      expect(result.jobs[1].workmode).toBe('on-site');
    });

    it('should handle empty jobs array', () => {
      const result = index.transformJobsForSOLR({ jobs: [] });
      expect(result.jobs).toEqual([]);
    });
  });

  describe('mapToJobModel', () => {
    it('should map raw job to job model format', () => {
      const rawJob = {
        url: 'https://explore-jobs.ciklum.com/en/sites/ciklum-career/job/123',
        title: 'Senior Developer',
        location: ['București'],
        workmode: 'remote',
      };

      const result = index.mapToJobModel(rawJob, COMPANY_CIF, COMPANY_NAME);

      expect(result.url).toBe(rawJob.url);
      expect(result.title).toBe(rawJob.title);
      expect(result.company).toBe(COMPANY_NAME);
      expect(result.cif).toBe(COMPANY_CIF);
      expect(result.location).toEqual(['București']);
      expect(result.workmode).toBe('remote');
      expect(result.status).toBe('scraped');
    });

    it('should remove undefined fields', () => {
      const rawJob = {
        url: 'https://test.com/1',
        title: 'Job 1',
      };

      const result = index.mapToJobModel(rawJob, '45871772');

      expect(result.location).toBeUndefined();
      expect(result.workmode).toBeUndefined();
    });

    it('should handle missing title', () => {
      const rawJob = { url: 'https://test.com/1' };

      const result = index.mapToJobModel(rawJob, '45871772');

      expect(result.title).toBeUndefined();
      expect(result.url).toBe('https://test.com/1');
    });
  });

  describe('parseApiJobs', () => {
    it('should parse Ciklum HTML response format', () => {
      const html = `
        <div>
          <a href="/en/sites/ciklum-career/job/12345">Job Link</a>
          <div class="job-tile__title">Senior Developer</div>
          <div class="primaryLocation">București</div>
          <div class="workplaceTypeName">Workplace (Remote)</div>
        </div>
      `;

      const result = index.parseApiJobs(html);

      expect(result.jobs.length).toBe(1);
      expect(result.jobs[0].title).toBe('Senior Developer');
      expect(result.jobs[0].url).toBe('https://explore-jobs.ciklum.com/en/sites/ciklum-career/job/12345');
      expect(result.jobs[0].location).toBe('București');
    });

    it('should handle empty HTML', () => {
      const result = index.parseApiJobs('<html></html>');
      expect(result.jobs).toEqual([]);
    });

    it('should handle multiple jobs', () => {
      const html = `
        <div>
          <a href="/en/sites/ciklum-career/job/111">Link 1</a>
          <div class="job-tile__title">Developer</div>
          <div class="primaryLocation">Cluj-Napoca</div>
          <div class="workplaceTypeName">Workplace (Hybrid)</div>
          <a href="/en/sites/ciklum-career/job/222">Link 2</a>
          <div class="job-tile__title">Designer</div>
          <div class="primaryLocation">Timișoara</div>
          <div class="workplaceTypeName">Workplace (Office)</div>
        </div>
      `;

      const result = index.parseApiJobs(html);

      expect(result.jobs.length).toBe(2);
      expect(result.jobs[0].title).toBe('Developer');
      expect(result.jobs[1].title).toBe('Designer');
    });
  });
});
