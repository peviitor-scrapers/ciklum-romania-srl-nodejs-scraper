import { execSync } from 'child_process';
import fs from 'fs';
import { fileURLToPath } from 'url';

const COMPANY = 'CIKLUM ROMANIA SRL';
const CIF = '45871772';
const FILTER_URL = 'https://explore-jobs.ciklum.com/en/sites/ciklum-career/jobs?lastSelectedFacet=LOCATIONS&selectedLocationsFacet=300000000468495';

function renderPage(url) {
  const html = execSync(
    `chromium --headless=new --disable-gpu --no-sandbox --dump-dom '${url}'`,
    { timeout: 30000, encoding: 'utf-8' }
  );
  const marker = '</script>';
  const bodyStart = html.indexOf(marker);
  return bodyStart === -1 ? html : html.slice(bodyStart + marker.length);
}

function parseJobs(html) {
  const jobs = [];
  const jobPattern = /<a class="job-list-item__link[^>]*href="[^"]*\/job\/([^/?]+)[^"]*"[^>]*>.*?job-tile__title[^>]*>([^<]+).*?primaryLocation[^>]*>([^<]+).*?(?:workplaceTypeName[^>]*>[^<]*\(([^)]+)\))?/gs;

  let match;
  while ((match = jobPattern.exec(html)) !== null) {
    const id = match[1];
    const title = match[2].replace(/&amp;/g, '&').trim();
    const location = match[3].trim();
    const workplace = match[4] ? match[4].trim() : '';

    const dateSection = html.slice(match.index, match.index + 2000);
    const dateMatch = dateSection.match(/job-list-item__job-info-value[^>]*>([^<]+)/);
    const date = dateMatch ? dateMatch[1].trim() : '';

    jobs.push({
      title,
      url: `https://explore-jobs.ciklum.com/en/sites/ciklum-career/job/${id}`,
      location: location === 'Poland' ? 'Romania' : location,
      workplaceType: workplace ? workplace.toLowerCase() : 'remote',
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
    location: [j.location],
    workmode: j.workplaceType,
    postingDate: j.postingDate,
    date: new Date().toISOString(),
    source: 'ciklum.com',
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
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch(err => {
    console.error(err.message || err);
    process.exit(1);
  });
}
