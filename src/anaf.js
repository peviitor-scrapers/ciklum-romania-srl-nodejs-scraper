import fetch from "node-fetch";
import { getCompanyFromCuifirma } from "./cuifirma.js";

const ANAF_API_URL = "https://demoanaf.ro/api/company/";
const ANAF_SEARCH_URL = "https://demoanaf.ro/api/search";

export async function getCompanyFromANAF(cif) {
  // Try ANAF once
  try {
    const url = `${ANAF_API_URL}${cif}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "job_seeker_ro_spider" }
    });

    if (!res.ok) {
      console.log(`ANAF failed: ${res.status}`);
    } else {
      const json = await res.json();
      if (json.success === false) {
        console.log(`ANAF failed: ${json.error?.message}`);
      } else {
        return json.data || null;
      }
    }
  } catch (err) {
    console.log(`ANAF failed: ${err.message}`);
  }

  // ANAF failed — try cuifirma.ro
  try {
    console.log("Trying CUIFirma as fallback...");
    const data = await getCompanyFromCuifirma(cif);
    if (data) {
      console.log(`CUIFirma returned name: ${data.name}`);
      return data;
    }
    console.log("CUIFirma returned no data");
  } catch (err) {
    console.log(`CUIFirma fallback failed: ${err.message}`);
  }

  throw new Error(`ANAF and CUIFirma both failed for CIF ${cif}`);
}

export async function getCompanyFromANAFWithFallback(cif, cachedData = null) {
  try {
    return await getCompanyFromANAF(cif);
  } catch (err) {
    console.log(`\n⚠️ ANAF API unavailable: ${err.message}`);
    if (cachedData) {
      console.log("✅ Using cached company data as fallback");
      return cachedData;
    }
    throw err;
  }
}

export async function searchCompany(brandName) {
  const url = `${ANAF_SEARCH_URL}?q=${encodeURIComponent(brandName)}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "job_seeker_ro_spider" }
  });

  if (!res.ok) {
    throw new Error(`ANAF search error: ${res.status}`);
  }

  const json = await res.json();
  return json.data || [];
}
