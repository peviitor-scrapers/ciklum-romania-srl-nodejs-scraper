import { jest } from '@jest/globals';
import fs from 'fs';

const mockFetch = jest.fn();

jest.unstable_mockModule('node-fetch', () => ({
  default: mockFetch
}));

const COMPANY_JSON_PATH = 'tmp/company.json';

function backupCompanyJson() {
  if (fs.existsSync(COMPANY_JSON_PATH)) {
    const content = fs.readFileSync(COMPANY_JSON_PATH, 'utf-8');
    fs.renameSync(COMPANY_JSON_PATH, `${COMPANY_JSON_PATH}.bak`);
    return content;
  }
  return null;
}

function restoreCompanyJson() {
  if (fs.existsSync(`${COMPANY_JSON_PATH}.bak`)) {
    fs.renameSync(`${COMPANY_JSON_PATH}.bak`, COMPANY_JSON_PATH);
  }
  return null;
}

function anafCompanyResponse(data) {
  return {
    ok: true,
    json: async () => ({ data, success: true })
  };
}

function peviitorResponse(companies) {
  return {
    ok: true,
    json: async () => ({ companies })
  };
}

function solrResponse(numFound, docs) {
  return {
    ok: true,
    json: async () => ({ response: { numFound, docs } })
  };
}

const CIKLUM_ANAF_RECORD = {
  cui: 45871772,
  name: 'CIKLUM ROMANIA SRL',
  address: 'BD IULIU MANIU, NR.6L, SECTOR 6, BUCUREŞTI',
  caenCode: '6210',
  inactive: false,
  vatRegistered: true,
  eFacturaRegistered: false,
  headquartersAddress: { locality: 'Sector 6 Mun. Bucureşti' }
};

describe('company.js', () => {
  let company;
  let savedCompanyJson;

  beforeAll(async () => {
    process.env.SOLR_AUTH = 'test:test';
    fs.mkdirSync("tmp", { recursive: true });
    savedCompanyJson = backupCompanyJson();
    company = await import('../../company.js');
  });

  afterAll(() => {
    delete process.env.SOLR_AUTH;
    restoreCompanyJson();
  });

  beforeEach(() => {
    mockFetch.mockReset();
    if (fs.existsSync(COMPANY_JSON_PATH)) {
      fs.unlinkSync(COMPANY_JSON_PATH);
    }
  });

  describe('getCompanyBrand', () => {
    it('should return the company brand', () => {
      const brand = company.getCompanyBrand();
      expect(typeof brand).toBe('string');
      expect(brand).toBe('Ciklum');
    });
  });

  describe('getCompanyData (live ANAF)', () => {
    it('should fetch Ciklum via direct CIF lookup', async () => {
      mockFetch.mockResolvedValueOnce(anafCompanyResponse(CIKLUM_ANAF_RECORD));

      const result = await company.getCompanyData();

      expect(result).toHaveProperty('company', 'CIKLUM ROMANIA SRL');
      expect(result).toHaveProperty('cif', '45871772');
      expect(result).toHaveProperty('active', true);
      expect(result).toHaveProperty('anafData');
    });

    it('should throw when ANAF returns no data', async () => {
      mockFetch.mockResolvedValueOnce(anafCompanyResponse(null));

      await expect(company.getCompanyData()).rejects.toThrow('No data from ANAF');
    });

    it('should throw when ANAF returns no company name', async () => {
      mockFetch.mockResolvedValueOnce(anafCompanyResponse({ cui: 45871772, name: null }));

      await expect(company.getCompanyData()).rejects.toThrow('ANAF returned no company name');
    });
  });

  describe('getCompanyData (cached)', () => {
    const cachedData = {
      anaf: CIKLUM_ANAF_RECORD,
      summary: {
        company: 'CIKLUM ROMANIA SRL',
        cif: '45871772',
        active: true
      }
    };

    beforeEach(() => {
      fs.writeFileSync(COMPANY_JSON_PATH, JSON.stringify(cachedData), 'utf-8');
    });

    it('should use cached company data when available', async () => {
      const result = await company.getCompanyData();

      expect(result.company).toBe('CIKLUM ROMANIA SRL');
      expect(result.cif).toBe('45871772');
      expect(result.active).toBe(true);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('validateAndGetCompany', () => {
    afterEach(() => {
      if (fs.existsSync(COMPANY_JSON_PATH)) {
        fs.unlinkSync(COMPANY_JSON_PATH);
      }
    });

    it('should return company data with status active', async () => {
      mockFetch
        .mockResolvedValueOnce(anafCompanyResponse(CIKLUM_ANAF_RECORD))
        .mockResolvedValueOnce(solrResponse(0, []))
        .mockResolvedValueOnce(peviitorResponse([{ company: 'Ciklum' }]));

      const result = await company.validateAndGetCompany();

      expect(result).toHaveProperty('status', 'active');
      expect(result).toHaveProperty('company', 'CIKLUM ROMANIA SRL');
      expect(result).toHaveProperty('cif', '45871772');
      expect(result).toHaveProperty('existingJobsCount');
    });
  });
});
