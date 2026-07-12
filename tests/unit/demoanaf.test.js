import { jest } from '@jest/globals';

const mockFetch = jest.fn();

jest.unstable_mockModule('node-fetch', () => ({
  default: mockFetch
}));

jest.unstable_mockModule('../../src/cuifirma.js', () => ({
  getCompanyFromCuifirma: jest.fn()
}));

function anafSearchResponse(results) {
  return {
    ok: true,
    json: async () => ({ data: results, success: true })
  };
}

function anafCompanyResponse(data) {
  return {
    ok: true,
    json: async () => ({ data, success: true })
  };
}

function errorResponse(status) {
  return {
    ok: false,
    status,
    text: async () => 'Error'
  };
}

const ANAF_RECORD = {
  cui: 45871772,
  name: 'CIKLUM ROMANIA SRL',
  address: 'BD IULIU MANIU, NR.6L, SECTOR 6, BUCUREŞTI',
  caenCode: '6210',
  inactive: false,
  registrationNumber: 'J2014005735405',
  vatRegistered: true,
  onrcStatusLabel: 'Funcțiune',
  legalForm: 'SRL'
};

const CACHED_DATA = {
  cui: 45871772,
  name: 'CIKLUM ROMANIA SRL',
  address: 'MUNICIPIUL BUCUREŞTI, SECTOR 6, BLD IULIU MANIU, NR.6L',
  registrationNumber: 'J2014005735405',
  caenCode: '6210',
  inactive: false,
  onrcStatusLabel: 'Funcțiune'
};

describe('src/anaf.js', () => {
  let anaf;
  let cuifirma;

  beforeAll(async () => {
    anaf = await import('../../src/anaf.js');
    cuifirma = await import('../../src/cuifirma.js');
  });

  beforeEach(() => {
    mockFetch.mockReset();
    cuifirma.getCompanyFromCuifirma.mockReset();
  });

  describe('searchCompany', () => {
    it('should return array of companies for valid brand', async () => {
      mockFetch.mockResolvedValue(anafSearchResponse([
        { cui: 45871772, name: 'CIKLUM ROMANIA SRL', statusLabel: 'Funcțiune' }
      ]));

      const results = await anaf.searchCompany('Ciklum');

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toHaveProperty('cui');
      expect(results[0]).toHaveProperty('name');
    });

    it('should return empty array for non-existent brand', async () => {
      mockFetch.mockResolvedValue(anafSearchResponse([]));

      const results = await anaf.searchCompany('NonExistentBrandXYZ123');

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(0);
    });

    it('should include statusLabel in results', async () => {
      mockFetch.mockResolvedValue(anafSearchResponse([
        { cui: 45871772, name: 'CIKLUM ROMANIA SRL', statusLabel: 'Funcțiune' }
      ]));

      const results = await anaf.searchCompany('Ciklum');

      expect(results[0]).toHaveProperty('statusLabel', 'Funcțiune');
    });

    it('should throw on HTTP error', async () => {
      mockFetch.mockResolvedValue(errorResponse(500));

      await expect(anaf.searchCompany('Ciklum')).rejects.toThrow('ANAF search error: 500');
    });

    it('should encode brand name in URL', async () => {
      let capturedUrl;
      mockFetch.mockImplementation((url) => {
        capturedUrl = url;
        return Promise.resolve(anafSearchResponse([]));
      });

      await anaf.searchCompany('Ciklum SRL');
      expect(capturedUrl).toContain(encodeURIComponent('Ciklum SRL'));
    });
  });

  describe('getCompanyFromANAF', () => {
    it('should return company data for valid CIF', async () => {
      mockFetch.mockResolvedValue(anafCompanyResponse(ANAF_RECORD));

      const data = await anaf.getCompanyFromANAF('45871772');

      expect(data).toBeDefined();
      expect(data.cui).toBe(45871772);
      expect(data.name).toBe('CIKLUM ROMANIA SRL');
      expect(data).toHaveProperty('address');
      expect(data).toHaveProperty('registrationNumber');
    });

    it('should fall back to cuifirma when ANAF fails', async () => {
      mockFetch.mockResolvedValue(errorResponse(500));
      cuifirma.getCompanyFromCuifirma.mockResolvedValue({
        cui: 45871772,
        name: 'CIKLUM ROMANIA SRL'
      });

      const data = await anaf.getCompanyFromANAF('45871772');

      expect(data).toBeDefined();
      expect(data.name).toBe('CIKLUM ROMANIA SRL');
      expect(cuifirma.getCompanyFromCuifirma).toHaveBeenCalledWith('45871772');
    });

    it('should throw when both ANAF and cuifirma fail', async () => {
      mockFetch.mockResolvedValue(errorResponse(500));
      cuifirma.getCompanyFromCuifirma.mockRejectedValue(new Error('cuifirma error'));

      await expect(anaf.getCompanyFromANAF('45871772')).rejects.toThrow();
    });

    it('should handle API-level error response', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: false, error: { message: 'Company not found' } })
      });
      cuifirma.getCompanyFromCuifirma.mockResolvedValue(null);

      await expect(anaf.getCompanyFromANAF('00000000')).rejects.toThrow();
    });

    it('should return null when data is null', async () => {
      mockFetch.mockResolvedValue(anafCompanyResponse(null));

      const data = await anaf.getCompanyFromANAF('45871772');
      expect(data).toBeNull();
    });
  });

  describe('getCompanyFromANAFWithFallback', () => {
    it('should return fresh data when API works', async () => {
      mockFetch.mockResolvedValue(anafCompanyResponse(ANAF_RECORD));

      const data = await anaf.getCompanyFromANAFWithFallback('45871772');

      expect(data.name).toBe('CIKLUM ROMANIA SRL');
    });

    it('should use cached data when API fails', async () => {
      mockFetch.mockResolvedValue(errorResponse(500));
      cuifirma.getCompanyFromCuifirma.mockRejectedValue(new Error('cuifirma error'));

      const data = await anaf.getCompanyFromANAFWithFallback('45871772', CACHED_DATA);

      expect(data).toEqual(CACHED_DATA);
    });

    it('should throw when API fails and no cache available', async () => {
      mockFetch.mockResolvedValue(errorResponse(500));
      cuifirma.getCompanyFromCuifirma.mockRejectedValue(new Error('cuifirma error'));

      await expect(anaf.getCompanyFromANAFWithFallback('45871772')).rejects.toThrow();
    });
  });
});
