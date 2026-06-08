import axios from 'axios';
import fs from 'fs';

const API_BASE = 'https://ialmme.fa.ocs.oraclecloud.com';
const ORIGIN = 'https://explore-jobs.ciklum.com';
const COMPANY = 'CIKLUM ROMANIA SRL';
const CIF = '45871772';

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

async function fetchRomanianJobs() {
  const { data } = await axios.get(
    `${API_BASE}/hcmRestApi/resources/latest/recruitingCEJobRequisitions`,
    {
      params: {
        onlyData: true,
        finder: 'findReqs;siteNumber=CX_1001',
        limit: 25,
        expand: 'requisitionList',
      },
      headers: {
        'User-Agent': 'job_seeker_ro_spider',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'application/json, text/plain, */*',
        'ora-irc-cx-userid': uuid(),
        'ora-irc-language': 'en',
        'Content-Type': 'application/vnd.oracle.adf.resourceitem+json;charset=utf-8',
        'Origin': ORIGIN,
        'Referer': `${ORIGIN}/en/sites/ciklum-career/jobs`,
      },
    }
  );

  const list = data?.items?.[0]?.requisitionList;
  if (!Array.isArray(list)) return [];

  return list.filter(j => j.PrimaryLocationCountry === 'RO');
}

async function main() {
  fs.mkdirSync('tmp', { recursive: true });

  const roJobs = await fetchRomanianJobs();

  const jobs = roJobs.map(j => ({
    title: j.Title,
    postingDate: j.PostedDate,
    url: `https://explore-jobs.ciklum.com/en/sites/ciklum-career/job/${j.Id}`,
  }));

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
  console.log(`Scraped ${uniqueJobs.length} unique jobs from Ciklum`);
  console.log('Saved to tmp/jobs.json');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
