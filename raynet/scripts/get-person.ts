/**
 * Detail kontaktu z Raynet CRM
 *
 * Usage:
 *   npx tsx ./skills/raynet/scripts/get-person.ts <ID>
 *   npx tsx ./skills/raynet/scripts/get-person.ts 67890 --json
 */

import { RaynetClient, Person } from "./lib/raynet-client.js";

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

function formatName(person: Person): string {
  const parts = [
    person.titleBefore,
    person.firstName,
    person.lastName,
    person.titleAfter,
  ].filter(Boolean);
  return parts.join(" ");
}

function formatPerson(person: Person): void {
  console.log(`=== ${formatName(person)} ===\n`);
  console.log(`ID: ${person.id}`);
  if (person.category) console.log(`Kategorie: ${person.category.value}`);
  if (person.owner) console.log(`Owner: ${person.owner.fullName}`);

  if (person.primaryRelationship) {
    console.log("\n--- Firma ---");
    if (person.primaryRelationship.company) {
      console.log(`Firma: ${person.primaryRelationship.company.name} [${person.primaryRelationship.company.id}]`);
    }
    if (person.primaryRelationship.position) {
      console.log(`Pozice: ${person.primaryRelationship.position}`);
    }
  }

  if (person.contactInfo) {
    console.log("\n--- Kontakt ---");
    if (person.contactInfo.email) console.log(`Email: ${person.contactInfo.email}`);
    if (person.contactInfo.email2) console.log(`Email 2: ${person.contactInfo.email2}`);
    if (person.contactInfo.tel1) console.log(`Tel: ${person.contactInfo.tel1}`);
    if (person.contactInfo.tel2) console.log(`Tel 2: ${person.contactInfo.tel2}`);
  }

  if (person.notice) {
    console.log("\n--- Poznámka ---");
    console.log(person.notice);
  }

  if (person.rowInfo) {
    console.log("\n--- Info ---");
    if (person.rowInfo.createdAt) console.log(`Vytvořeno: ${person.rowInfo.createdAt}`);
    if (person.rowInfo.updatedAt) console.log(`Upraveno: ${person.rowInfo.updatedAt}`);
  }
}

async function main() {
  const { id, json } = parseArgs();

  if (!id || isNaN(id)) {
    console.error("Usage: npx tsx get-person.ts <ID> [--json]");
    process.exit(1);
  }

  const client = RaynetClient.createFromCredentialsFile();
  const person = await client.getPerson(id);

  if (json) {
    console.log(JSON.stringify(person, null, 2));
    return;
  }

  formatPerson(person);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
