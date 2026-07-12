/**
 * Ciklum Job Scraper - Main Entry Point
 * 
 * PURPOSE: Scrapes job listings from Ciklum Careers Romania (via Chromium headless)
 * and stores them in Solr.
 * This is the primary orchestrator that coordinates company validation, job scraping,
 * data transformation, and Solr storage.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { validateAndGetCompany } from './company.js';
import { querySOLR, upsertJobs, upsertCompany } from './solr.js';
import { generateJobsMarkdown } from './src/markdown-generator.js';
import companyConfig from './config/company.js';

// ============================================================================
// CONFIGURATION CONSTANTS — derived from config/company.json
// ============================================================================

const COMPANY_CIF = companyConfig.cif;
const FILTER_URL = 'https://explore-jobs.ciklum.com/en/sites/ciklum-career/jobs?lastSelectedFacet=LOCATIONS&selectedLocationsFacet=300000000468495';

// Global variable to store company name after validation
let COMPANY_NAME = null;

// ============================================================================
// CHROMIUM RENDERING - Fetching rendered HTML from Oracle HCM SPA
// ============================================================================

function renderPage(url) {
  const html = execSync(
    `chromium --headless=new --disable-gpu --no-sandbox --dump-dom --virtual-time-budget=10000 '${url}'`,
    { timeout: 60000, encoding: 'utf-8' }
  );
  const marker = '</script>';
  const bodyStart = html.indexOf(marker);
  return bodyStart === -1 ? html : html.slice(bodyStart + marker.length);
}

// ============================================================================
// DATA PARSING - Converting rendered HTML to our job model
// ============================================================================

/**
 * Parses rendered HTML into our standardized job format
 * @param {string} html - Rendered HTML from Chromium
 * @returns {Object} - Object containing jobs array and total count
 */
function parseApiJobs(html) {
  const jobs = [];

  const links = [...html.matchAll(/href="([^"]*\/job\/(\d+)[^"]*)"/g)];
  const titles = [...html.matchAll(/job-tile__title[^"]*"[^>]*>([^<]+)/g)].filter(m => m[1].trim());
  const locs = [...html.matchAll(/primaryLocation">([^<]+)/g)];
  const wps = [...html.matchAll(/workplaceTypeName">[^<]*\(([^)]+)\)/g)];
  const dates = [...html.matchAll(/job-list-item__job-info-value[^>]*>([^<]+)/g)].filter(m => m[1].trim());

  for (let i = 0; i < links.length; i++) {
    const id = links[i][2];
    const title = (titles[i] ? titles[i][1] : '').replace(/&amp;/g, '&').trim();
    const location = (locs[i] ? locs[i][1] : 'România').trim();
    const workplace = wps[i] ? wps[i][1].trim().toLowerCase() : 'remote';
    const date = dates[i] ? dates[i][1].trim() : '';

    if (!title) continue;

    jobs.push({
      title,
      url: `https://explore-jobs.ciklum.com/en/sites/ciklum-career/job/${id}`,
      location: location === 'Poland' ? 'Romania' : location,
      workmode: workplace,
      postingDate: date,
    });
  }

  return { jobs, total: jobs.length };
}

// ============================================================================
// DATA TRANSFORMATION - Preparing jobs for Solr storage
// ============================================================================

/**
 * Maps raw job data to Solr-compatible job model with timestamps and status
 * @param {Object} rawJob - Job object from scraper
 * @param {string} cif - Company identifier
 * @param {string} companyName - Company name
 * @returns {Object} - Job object ready for Solr storage
 */
function mapToJobModel(rawJob, cif, companyName = COMPANY_NAME) {
  const now = new Date().toISOString();

  const job = {
    url: rawJob.url,
    title: rawJob.title,
    company: companyName,
    cif: cif,
    location: rawJob.location?.length ? rawJob.location : undefined,
    workmode: rawJob.workmode || undefined,
    date: now,
    status: "scraped"
  };

  // Remove undefined fields to keep payload clean
  Object.keys(job).forEach((k) => job[k] === undefined && delete job[k]);

  return job;
}

/**
 * Transforms jobs to match Solr schema and filters for Romanian locations
 * - Ensures company name is uppercase
 * - Filters locations to only Romanian cities
 * - Normalizes work mode values
 * @param {Object} payload - Job payload with jobs array
 * @returns {Object} - Transformed payload ready for Solr
 */
function transformJobsForSOLR(payload) {
  // List of Romanian cities for location validation
  const romanianCities = [
    'Bucharest', 'București', 'Cluj-Napoca', 'Cluj Napoca',
    'Timișoara', 'Timisoara', 'Iași', 'Iasi', 'Brașov', 'Brasov',
    'Constanța', 'Constanta', 'Craiova', 'Bacău', 'Sibiu',
    'Târgu Mureș', 'Targu Mures', 'Oradea', 'Baia Mare', 'Satu Mare',
    'Ploiești', 'Ploiesti', 'Pitești', 'Pitesti', 'Arad', 'Galați', 'Galati',
    'Brăila', 'Braila', 'Drobeta-Turnu Severin', 'Râmnicu Vâlcea', 'Ramnicu Valcea',
    'Buzău', 'Buzau', 'Botoșani', 'Botosani', 'Zalău', 'Zalau', 'Hunedoara', 'Deva',
    'Suceava', 'Bistrița', 'Bistrita', 'Tulcea', 'Călărași', 'Calarasi',
    'Giurgiu', 'Alba Iulia', 'Slatina', 'Piatra Neamț', 'Piatra Neamt', 'Roman',
    'Dumbrăvița', 'Dumbravita', 'Voluntari', 'Popești-Leordeni', 'Popesti-Leordeni',
    'Chitila', 'Mogoșoaia', 'Mogosoaia', 'Otopeni'
  ];

  const citySet = new Set(romanianCities.map(c => c.toLowerCase()));

  const normalizeWorkmode = (wm) => {
    if (!wm) return undefined;
    const lower = wm.toLowerCase();
    if (lower.includes('remote')) return 'remote';
    if (lower.includes('office') || lower.includes('on-site') || lower.includes('site')) return 'on-site';
    return 'hybrid';
  };

  const transformed = {
    ...payload,
    company: payload.company?.toUpperCase(),
    jobs: payload.jobs.map(job => {
      const loc = Array.isArray(job.location) ? job.location : (job.location ? [job.location] : []);
      const validLocations = loc.filter(locItem => {
        const lower = locItem.toLowerCase().trim();
        if (lower === 'romania' || lower === 'românia') return true;
        return citySet.has(lower);
      }).map(locItem => locItem.toLowerCase() === 'romania' ? 'România' : locItem);

      return {
        ...job,
        location: validLocations.length > 0 ? validLocations : ['România'],
        workmode: normalizeWorkmode(job.workmode)
      };
    })
  };

  return transformed;
}

// ============================================================================
// MAIN ORCHESTRATION - Coordinates the entire scraping workflow
// ============================================================================

async function main() {
  fs.mkdirSync('tmp', { recursive: true });

  try {
    // Step 1: Get existing jobs count
    console.log("=== Step 1: Get existing jobs count ===");
    const existingResult = await querySOLR(COMPANY_CIF);
    const existingCount = existingResult.numFound;
    console.log(`Found ${existingCount} existing jobs in SOLR`);

    // Step 2: Validate company via ANAF
    console.log("=== Step 2: Validate company via ANAF ===");
    const { company, cif, address } = await validateAndGetCompany();
    COMPANY_NAME = company;
    const localCif = cif;

    // Upsert company to SOLR
    try {
      await upsertCompany({
        id: cif,
        company,
        brand: companyConfig.brand,
        status: "activ",
        location: address ? [address] : [companyConfig.defaultLocation],
        website: [companyConfig.website],
        career: [companyConfig.careerUrl],
        lastScraped: new Date().toISOString().split('T')[0],
        scraperFile: companyConfig.scraperFile
      });
    } catch (err) {
      console.log(`Note: Could not upsert company to SOLR core: ${err.message}`);
    }

    // Step 3: Render and parse Ciklum careers page
    console.log("=== Step 3: Scrape jobs ===");
    console.log('Rendering Ciklum careers page with Romania filter...');
    const html = renderPage(FILTER_URL);
    const result = parseApiJobs(html);
    const rawJobs = result.jobs;
    console.log(`Found ${rawJobs.length} Romanian jobs`);

    // Deduplicate by URL
    const uniqueJobs = Array.from(
      new Map(rawJobs.map(j => [j.url, j])).values()
    );

    // Step 4: Map raw jobs to Solr model
    const jobs = uniqueJobs.map(job => mapToJobModel(job, localCif));

    const payload = {
      source: 'ciklum.com',
      scrapedAt: new Date().toISOString(),
      company: COMPANY_NAME,
      cif: localCif,
      jobs
    };

    // Step 5: Transform jobs for SOLR
    console.log("Transforming jobs for SOLR...");
    const transformedPayload = transformJobsForSOLR(payload);
    console.log(`Jobs with valid Romanian locations: ${transformedPayload.jobs.length}`);

    // Save to file
    fs.writeFileSync('tmp/jobs.json', JSON.stringify(transformedPayload, null, 2), 'utf-8');
    console.log('Saved tmp/jobs.json');

    // Generate docs/jobs.md
    const companyData = {
      id: String(localCif),
      company: transformedPayload.company,
      brand: companyConfig.brand,
      status: 'activ',
      location: address ? [address] : [companyConfig.defaultLocation],
      website: [companyConfig.website],
      career: [companyConfig.careerUrl],
      lastScraped: new Date().toISOString().split('T')[0],
    };
    const md = generateJobsMarkdown(companyData, transformedPayload.jobs);
    fs.mkdirSync('docs', { recursive: true });
    fs.writeFileSync('docs/jobs.md', md, 'utf-8');
    console.log('Generated docs/jobs.md');

    // Save company config for GitHub Pages
    fs.writeFileSync('docs/company.json', JSON.stringify(companyConfig, null, 2), 'utf-8');
    console.log('Saved docs/company.json');

    // Step 6: Upsert jobs to SOLR
    console.log("\n=== Step 6: Upsert jobs to SOLR ===");
    await upsertJobs(transformedPayload.jobs);

    // Step 7: Verify final count
    const finalResult = await querySOLR(COMPANY_CIF);
    console.log(`\n=== SUMMARY ===`);
    console.log(`Jobs existing in SOLR before scrape: ${existingCount}`);
    console.log(`Jobs scraped from Ciklum website: ${rawJobs.length}`);
    console.log(`Jobs in SOLR after scrape: ${finalResult.numFound}`);

    console.log("\n=== DONE ===");
    console.log("Scraper completed successfully!");

  } catch (err) {
    console.error("Scraper failed:", err);
    process.exit(1);
  }
}

// Export functions for testing
export { parseApiJobs, mapToJobModel, transformJobsForSOLR };

// Run main function when executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
