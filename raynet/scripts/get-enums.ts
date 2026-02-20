#!/usr/bin/env npx tsx

/**
 * Výpis enum hodnot z Raynet API
 *
 * Usage:
 *   npx tsx ./skills/raynet/scripts/get-enums.ts
 *   npx tsx ./skills/raynet/scripts/get-enums.ts --type=company-category
 *   npx tsx ./skills/raynet/scripts/get-enums.ts --type=bc-phase --json
 */

import { RaynetClient } from "./lib/raynet-client.js";

const USAGE = `
Výpis enum hodnot z Raynet API

Usage:
  npx tsx get-enums.ts [options]

Options:
  --type=TYPE     Typ enumů k zobrazení:
                    all (default) - všechny
                    company-category - kategorie firem
                    contact-source - zdroje kontaktů
                    lead-phase - fáze leadů
                    bc-phase - fáze obchodních případů
                    bc-category - kategorie OP
                    currency - měny
                    custom-fields - vlastní pole OP
  --json          Výstup v JSON formátu

Příklady:
  npx tsx get-enums.ts
  npx tsx get-enums.ts --type=bc-phase
  npx tsx get-enums.ts --type=company-category --json
`;

interface EnumValue {
  id: number;
  code01?: string;
  code02?: string;
  value?: string;
}

interface EnumResult {
  success: string;
  data: EnumValue[];
}

async function getCompanyCategories(client: RaynetClient): Promise<EnumValue[]> {
  const result = await client.apiRequest<EnumResult>("GET", "/companyCategory/");
  return result.data || [];
}

async function getContactSources(client: RaynetClient): Promise<EnumValue[]> {
  const result = await client.apiRequest<EnumResult>("GET", "/contactSource/");
  return result.data || [];
}

async function getLeadPhases(client: RaynetClient): Promise<EnumValue[]> {
  const result = await client.apiRequest<EnumResult>("GET", "/leadPhase/");
  return result.data || [];
}

async function getBusinessCasePhases(client: RaynetClient): Promise<EnumValue[]> {
  const result = await client.apiRequest<EnumResult>("GET", "/businessCasePhase/");
  return result.data || [];
}

async function getBusinessCaseCategories(client: RaynetClient): Promise<EnumValue[]> {
  const result = await client.apiRequest<EnumResult>("GET", "/businessCaseCategory/");
  return result.data || [];
}

async function getCurrencies(client: RaynetClient): Promise<EnumValue[]> {
  const result = await client.apiRequest<EnumResult>("GET", "/currency/");
  return result.data || [];
}

async function getBusinessCaseCustomFields(client: RaynetClient): Promise<unknown[]> {
  const result = await client.apiRequest<{ data: unknown[] }>("GET", "/customField/?entity=businessCase");
  return result.data || [];
}

function formatTable(title: string, data: EnumValue[]): void {
  console.log(`\n=== ${title} ===\n`);
  console.log("ID".padEnd(8) + "Hodnota");
  console.log("-".repeat(50));
  for (const item of data) {
    const value = item.code01 || item.code02 || item.value || "N/A";
    console.log(`${String(item.id).padEnd(8)}${value}`);
  }
}

function formatCustomFieldsTable(title: string, data: unknown[]): void {
  console.log(`\n=== ${title} ===\n`);
  console.log("Název".padEnd(30) + "Kód (pro API)");
  console.log("-".repeat(70));
  for (const item of data as Array<{ name: string; code: string }>) {
    console.log(`${item.name.padEnd(30)}${item.code}`);
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    console.log(USAGE);
    return;
  }

  const options: Record<string, string> = {};
  args.forEach((arg) => {
    if (arg.startsWith("--")) {
      const [key, value] = arg.slice(2).split("=");
      options[key] = value ?? "true";
    }
  });

  const type = options.type || "all";
  const json = options.json === "true";

  const client = RaynetClient.createFromCredentialsFile();

  const results: Record<string, unknown> = {};

  if (type === "all" || type === "company-category") {
    results.companyCategories = await getCompanyCategories(client);
  }

  if (type === "all" || type === "contact-source") {
    results.contactSources = await getContactSources(client);
  }

  if (type === "all" || type === "lead-phase") {
    results.leadPhases = await getLeadPhases(client);
  }

  if (type === "all" || type === "bc-phase") {
    results.businessCasePhases = await getBusinessCasePhases(client);
  }

  if (type === "all" || type === "bc-category") {
    results.businessCaseCategories = await getBusinessCaseCategories(client);
  }

  if (type === "all" || type === "currency") {
    results.currencies = await getCurrencies(client);
  }

  if (type === "all" || type === "custom-fields") {
    try {
      results.customFields = await getBusinessCaseCustomFields(client);
    } catch (e: unknown) {
      if (type === "custom-fields") {
        console.error("Chyba: Endpoint /customField/ není dostupný na této instanci.");
        process.exit(1);
      }
      // V "all" režimu tiše přeskočíme nedostupný endpoint
    }
  }

  if (json) {
    console.log(JSON.stringify(results, null, 2));
    return;
  }

  // Formatted output
  if (results.companyCategories) {
    formatTable("Kategorie firem (--category pro create-company)", results.companyCategories as EnumValue[]);
  }

  if (results.contactSources) {
    formatTable("Zdroje kontaktů (--contact-source pro create-company)", results.contactSources as EnumValue[]);
  }

  if (results.leadPhases) {
    formatTable("Fáze leadů (--phase pro update-lead)", results.leadPhases as EnumValue[]);
  }

  if (results.businessCasePhases) {
    formatTable("Fáze OP (--phase pro create-business-case)", results.businessCasePhases as EnumValue[]);
  }

  if (results.businessCaseCategories) {
    formatTable("Kategorie OP (--category pro create-business-case)", results.businessCaseCategories as EnumValue[]);
  }

  if (results.currencies) {
    formatTable("Měny (--currency)", results.currencies as EnumValue[]);
  }

  if (results.customFields) {
    formatCustomFieldsTable("Vlastní pole OP (--custom-field)", results.customFields as unknown[]);
  }

  console.log();
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
