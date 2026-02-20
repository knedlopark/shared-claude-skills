/**
 * Detail firmy z Raynet CRM
 *
 * Usage:
 *   npx tsx ./skills/raynet/scripts/get-company.ts <ID>
 *   npx tsx ./skills/raynet/scripts/get-company.ts 12345 --json
 */

import { RaynetClient, Company } from "./lib/raynet-client.js";

function parseArgs() {
  const args = process.argv.slice(2);
  let id: number | null = null;
  let json = false;

  for (const arg of args) {
    if (arg === "--json") {
      json = true;
    } else if (!arg.startsWith("-")) {
      id = parseInt(arg, 10);
    }
  }

  return { id, json };
}

function formatCompany(company: Company): void {
  console.log(`=== ${company.name} ===\n`);
  console.log(`ID: ${company.id}`);
  if (company.regNumber) console.log(`IČO: ${company.regNumber}`);
  if (company.taxNumber) console.log(`DIČ: ${company.taxNumber}`);
  if (company.rating) console.log(`Rating: ${company.rating}`);
  if (company.state) console.log(`Stav: ${company.state}`);
  if (company.role) console.log(`Role: ${company.role}`);
  if (company.category) console.log(`Kategorie: ${company.category.value}`);
  if (company.owner) console.log(`Owner: ${company.owner.fullName}`);

  if (company.contactInfo) {
    console.log("\n--- Kontakt ---");
    if (company.contactInfo.email) console.log(`Email: ${company.contactInfo.email}`);
    if (company.contactInfo.email2) console.log(`Email 2: ${company.contactInfo.email2}`);
    if (company.contactInfo.tel1) console.log(`Tel: ${company.contactInfo.tel1}`);
    if (company.contactInfo.tel2) console.log(`Tel 2: ${company.contactInfo.tel2}`);
    if (company.contactInfo.www) console.log(`Web: ${company.contactInfo.www}`);
  }

  if (company.address) {
    console.log("\n--- Adresa ---");
    if (company.address.street) console.log(`Ulice: ${company.address.street}`);
    if (company.address.city) console.log(`Město: ${company.address.city}`);
    if (company.address.zipCode) console.log(`PSČ: ${company.address.zipCode}`);
    if (company.address.country) console.log(`Země: ${company.address.country}`);
  }

  if (company.notice) {
    console.log("\n--- Poznámka ---");
    console.log(company.notice);
  }

  if (company.rowInfo) {
    console.log("\n--- Info ---");
    if (company.rowInfo.createdAt) console.log(`Vytvořeno: ${company.rowInfo.createdAt}`);
    if (company.rowInfo.updatedAt) console.log(`Upraveno: ${company.rowInfo.updatedAt}`);
  }
}

async function main() {
  const { id, json } = parseArgs();

  if (!id || isNaN(id)) {
    console.error("Usage: npx tsx get-company.ts <ID> [--json]");
    process.exit(1);
  }

  const client = RaynetClient.createFromCredentialsFile();
  const company = await client.getCompany(id);

  if (json) {
    console.log(JSON.stringify(company, null, 2));
    return;
  }

  formatCompany(company);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
