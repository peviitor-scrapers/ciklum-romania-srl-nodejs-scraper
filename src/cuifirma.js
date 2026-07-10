import fetch from "node-fetch";

const cuifirmaUrl = "https://cuifirma.ro/mcp/cuifirma";

export async function getCompanyFromCuifirma(cif) {
  const cui = String(cif).replace(/^RO/i, "");

  const res = await fetch(cuifirmaUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "job_seeker_ro_spider"
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: {
        name: "get-firm-profile",
        arguments: { cui }
      }
    })
  });

  if (!res.ok) {
    throw new Error(`CUIFirma MCP error: ${res.status}`);
  }

  const json = await res.json();

  if (json.error) {
    throw new Error(`CUIFirma MCP: ${json.error.message || JSON.stringify(json.error)}`);
  }

  const content = json.result?.content?.[0];
  if (!content || json.result?.isError) {
    return null;
  }

  const profile = typeof content.text === "string" ? JSON.parse(content.text) : content.text;
  if (!profile || !profile.cui) {
    return null;
  }

  return {
    name: profile.name || profile.display_name,
    cui: Number(profile.cui),
    inactive: profile.is_active === false,
    inactiveSince: null,
    reactivatedSince: null,
    address: profile.location || null,
    headquartersAddress: profile.location ? { locality: profile.location } : undefined,
    registrationNumber: extractRegNumber(profile),
    caenCode: profile.primary_caen_display || null,
    vatRegistered: extractVatStatus(profile),
    eFacturaRegistered: extractEFactura(profile)
  };
}

function extractRegNumber(profile) {
  const idSection = profile.sections?.find(s => s.key === "identificare_juridica");
  const regField = idSection?.fields?.find(f => f.label === "Număr registru");
  return regField?.value || null;
}

function extractVatStatus(profile) {
  const fiscalSection = profile.sections?.find(s => s.key === "rezumat_fiscal");
  const tvaField = fiscalSection?.fields?.find(f => f.label === "Status TVA");
  return tvaField?.value?.toLowerCase().includes("plătitor") ?? null;
}

function extractEFactura(profile) {
  const fiscalSection = profile.sections?.find(s => s.key === "rezumat_fiscal");
  const efField = fiscalSection?.fields?.find(f => f.label === "RO e-Factura");
  return efField?.value?.toLowerCase().includes("înregistrat") ?? null;
}
