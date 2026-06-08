import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';
import { fileURLToPath } from 'url';

const URL = 'https://explore-jobs.ciklum.com/en/sites/ciklum-career/jobs?lastSelectedFacet=LOCATIONS&selectedLocationsFacet=300000000468495';

async function main() {
  const { data: html } = await axios.get(URL, {
    headers: {
      'User-Agent': 'job_seeker_ro_spider',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  });

  fs.mkdirSync("tmp", { recursive: true });
  fs.writeFileSync("tmp/page.html", html, "utf-8");

  const $ = cheerio.load(html);
  const jobs = [];

  $('a[href*="/en/sites/ciklum-career/job/"]').each((_, el) => {
    const a = $(el);
    const href = a.attr('href');
    const text = a.text().replace(/\s+/g, ' ').trim();

    const title = text.split(' Locations ')[0].trim();
    const postingMatch = text.match(/Posting Date\s+(\d{2}\/\d{2}\/\d{4})/);
    const postingDate = postingMatch ? postingMatch[1] : null;

    if (title && href) {
      const fullUrl = href.startsWith('http') ? href : `https://explore-jobs.ciklum.com${href}`;
      jobs.push({ title, postingDate, url: fullUrl });
    }
  });

  const uniqueJobs = Array.from(
    new Map(jobs.map(j => [j.url, j])).values()
  );

  const payload = {
    source: "ciklum.com",
    scrapedAt: new Date().toISOString(),
    company: "CIKLUM ROMANIA SRL",
    cif: "45871772",
    jobs: uniqueJobs
  };

  fs.writeFileSync("tmp/jobs.json", JSON.stringify(payload, null, 2), "utf-8");
  console.log(`Scraped ${uniqueJobs.length} unique jobs from Ciklum`);
  console.log(`Saved to tmp/jobs.json`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
