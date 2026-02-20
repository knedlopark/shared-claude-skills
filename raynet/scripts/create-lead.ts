/**
 * Vytvoření leadu v Raynet CRM
 *
 * Usage:
 *   npx tsx ./skills/raynet/scripts/create-lead.ts --topic="Nový projekt"
 *   npx tsx ./skills/raynet/scripts/create-lead.ts --topic="Lead" --company-name="Firma s.r.o." --email=info@firma.cz
 */

import { RaynetClient, CreateLeadRequest } from "./lib/raynet-client.js";

function parseArgs(): CreateLeadRequest & { help?: boolean; ownerName?: string } {
  const args = process.argv.slice(2);
  const result: CreateLeadRequest & { help?: boolean; ownerName?: string } = {
    topic: "",
  };

  for (const arg of args) {
    if (arg === "--help" || arg === "-h") {
      result.help = true;
    } else if (arg.startsWith("--topic=")) {
      result.topic = arg.split("=").slice(1).join("=");
    } else if (arg.startsWith("--owner=")) {
      result.owner = parseInt(arg.split("=")[1], 10);
    } else if (arg.startsWith("--owner-name=")) {
      result.ownerName = arg.split("=").slice(1).join("=");
    } else if (arg.startsWith("--phase=")) {
      result.leadPhase = parseInt(arg.split("=")[1], 10);
    } else if (arg.startsWith("--priority=")) {
      result.priority = arg.split("=")[1];
    } else if (arg.startsWith("--company-name=")) {
      result.companyName = arg.split("=").slice(1).join("=");
    } else if (arg.startsWith("--first-name=")) {
      result.firstName = arg.split("=").slice(1).join("=");
    } else if (arg.startsWith("--last-name=")) {
      result.lastName = arg.split("=").slice(1).join("=");
    } else if (arg.startsWith("--email=")) {
      result.contactInfo = result.contactInfo || {};
      result.contactInfo.email = arg.split("=").slice(1).join("=");
    } else if (arg.startsWith("--tel=") || arg.startsWith("--phone=")) {
      result.contactInfo = result.contactInfo || {};
      result.contactInfo.tel1 = arg.split("=")[1];
    } else if (arg.startsWith("--notice=")) {
      result.notice = arg.split("=").slice(1).join("=");
    }
  }

  return result;
}

function showHelp(): void {
  console.log(`
Vytvoření leadu v Raynet CRM

Usage:
  npx tsx create-lead.ts --topic="..." [options]

Povinné parametry:
  --topic=TEXT          Téma/název leadu

Volitelné parametry:
  --owner=ID            ID vlastníka
  --owner-name=NAME     Jméno vlastníka (automaticky najde ID)
  --phase=ID            ID fáze leadu
  --priority=VALUE      Priorita (NORMAL, HIGH, ...)
  --company-name=TEXT   Název firmy
  --first-name=TEXT     Jméno kontaktu
  --last-name=TEXT      Příjmení kontaktu
  --email=TEXT          Email
  --tel=TEXT            Telefon
  --notice=TEXT         Poznámka

Příklady:
  npx tsx create-lead.ts --topic="Nový projekt"
  npx tsx create-lead.ts --topic="Lead" --company-name="Firma s.r.o." --email=info@firma.cz
  npx tsx create-lead.ts --topic="Zájem o produkt" --owner-name="Roman Kytka" --priority=HIGH
`);
}

async function main() {
  const data = parseArgs();

  if (data.help) {
    showHelp();
    return;
  }

  if (!data.topic) {
    console.error("Chyba: --topic je povinný parametr");
    console.error("Použij --help pro zobrazení nápovědy");
    process.exit(1);
  }

  const client = RaynetClient.createFromCredentialsFile();

  // Resolve owner name to ID
  if (data.ownerName && !data.owner) {
    const ownerId = await client.findOwnerId(data.ownerName);
    if (ownerId) {
      data.owner = ownerId;
    } else {
      console.error(`Varování: Vlastník "${data.ownerName}" nenalezen`);
    }
  }

  // Remove helper fields
  const { help, ownerName, ...leadData } = data;

  const result = await client.createLead(leadData);

  console.log(`✓ Lead vytvořen s ID: ${result.id}`);
  console.log(`  URL: https://app.raynet.cz/gimmedata/?view=DetailView&en=Lead&ei=${result.id}`);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
