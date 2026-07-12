import { execSync } from 'child_process';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { generateJobsMarkdown } from './src/markdown-generator.js';
import companyConfig from './config/company.js';

const COMPANY = companyConfig.legalName;
const CIF = companyConfig.cif;
const FILTER_URL = 'https://explore-jobs.ciklum.com/en/sites/ciklum-career/jobs?lastSelectedFacet=LOCATIONS&selectedLocationsFacet=300000000468495';

function renderPage(url) {
  const html = execSync(
    `chromium --headless=new --disable-gpu --no-sandbox --dump-dom --virtual-time-budget=10000 '${url}'`,
    { timeout: 60000, encoding: 'utf-8' }
  );
  const marker = '</script>';
  const bodyStart = html.indexOf(marker);
  return bodyStart === -1 ? html : html.slice(bodyStart + marker.length);
}

function parseJobs(html) {
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
      workplaceType: workplace,
      postingDate: date,
    });
  }

  return jobs;
}

async function uploadJobsToSolr(jobs) {
  const AUTH = process.env.SOLR_AUTH;
  if (!AUTH) {
    console.log('SOLR_AUTH not set - skipping SOLR upload');
    return;
  }

  const solrJobs = jobs.map(j => ({
    cif: CIF,
    company: COMPANY,
    title: j.title,
    url: j.url,
    location: [j.location === 'Romania' ? 'București' : j.location],
    workmode: j.workplaceType,
    date: new Date().toISOString(),
    status: 'scraped',
  }));

  const params = new URLSearchParams({ commit: 'true' });

  const res = await fetch(
    `https://solr.peviitor.ro/solr/job/update?${params}`,
    {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(AUTH).toString('base64'),
        'Content-Type': 'application/json',
        'User-Agent': 'job_seeker_ro_spider',
      },
      body: JSON.stringify(solrJobs),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`SOLR upload error: ${res.status} - ${text}`);
  }

  console.log(`Uploaded ${solrJobs.length} jobs to SOLR`);
}

async function main() {
  fs.mkdirSync('tmp', { recursive: true });

  console.log('Rendering Ciklum careers page with Romania filter...');
  const html = renderPage(FILTER_URL);

  const jobs = parseJobs(html);
  console.log(`Found ${jobs.length} Romanian jobs`);

  const uniqueJobs = Array.from(
    new Map(jobs.map(j => [j.url, j])).values()
  );

  const payload = {
    source: 'ciklum.com',
    scrapedAt: new Date().toISOString(),
    company: COMPANY,
    cif: CIF,
    jobs: uniqueJobs,
  };

  fs.writeFileSync('tmp/jobs.json', JSON.stringify(payload, null, 2), 'utf-8');
  console.log(`Saved ${uniqueJobs.length} jobs to tmp/jobs.json`);

  await uploadJobsToSolr(uniqueJobs);

  // Generate docs/jobs.md
  const companyData = {
    id: String(CIF),
    company: COMPANY,
    brand: companyConfig.brand,
    status: 'activ',
    location: [companyConfig.defaultLocation],
    website: [companyConfig.website],
    career: [companyConfig.careerUrl],
    lastScraped: new Date().toISOString().split('T')[0],
  };
  const md = generateJobsMarkdown(companyData, uniqueJobs);
  fs.mkdirSync('docs', { recursive: true });
  fs.writeFileSync('docs/jobs.md', md, 'utf-8');
  console.log('Generated docs/jobs.md');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch(err => {
    console.error(err.message || err);
    process.exit(1);
  });
}
