/**
 * Aktualizace firmy v Raynet CRM
 *
 * Usage:
 *   npx tsx ./skills/raynet/scripts/update-company.ts 123 --name="Nový název"
 *   npx tsx ./skills/raynet/scripts/update-company.ts 123 --email=novy@email.cz --tel=123456789
 */

import { RaynetClient, UpdateCompanyRequest } from "./lib/raynet-client.js";

function parseArgs(): { id?: number; data: UpdateCompanyRequest; help?: boolean; ownerName?: string } {
  const args = process.argv.slice(2);
  const result: { id?: number; data: UpdateCompanyRequest; help?: boolean; ownerName?: string } = {
    data: {},
  };

  for (const arg of args) {
    if (arg === "--help" || arg === "-h") {
      result.help = true;
    } else if (!arg.startsWith("--") && !result.id) {
      result.id = parseInt(arg, 10);
    } else if (arg.startsWith("--name=")) {
      result.data.name = arg.split("=").slice(1).join("=");
    } else if (arg.startsWith("--ico=") || arg.startsWith("--reg-number=")) {
      result.data.regNumber = arg.split("=")[1];
    } else if (arg.startsWith("--dic=") || arg.startsWith("--tax-number=")) {
      result.data.taxNumber = arg.split("=")[1];
    } else if (arg.startsWith("--owner=")) {
      result.data.owner = parseInt(arg.split("=")[1], 10);
    } else if (arg.startsWith("--owner-name=")) {
      result.ownerName = arg.split("=").slice(1).join("=");
    } else if (arg.startsWith("--rating=")) {
      result.data.rating = arg.split("=")[1];
    } else if (arg.startsWith("--state=")) {
      result.data.state = arg.split("=")[1];
    } else if (arg.startsWith("--role=")) {
      result.data.role = arg.split("=")[1];
    } else if (arg.startsWith("--category=")) {
      result.data.category = parseInt(arg.split("=")[1], 10);
    } else if (arg.startsWith("--email=")) {
      result.data.contactInfo = result.data.contactInfo || {};
      result.data.contactInfo.email = arg.split("=").slice(1).join("=");
    } else if (arg.startsWith("--tel=") || arg.startsWith("--phone=")) {
      result.data.contactInfo = result.data.contactInfo || {};
      result.data.contactInfo.tel1 = arg.split("=")[1];
    } else if (arg.startsWith("--www=") || arg.startsWith("--web=")) {
      result.data.contactInfo = result.data.contactInfo || {};
      result.data.contactInfo.www = arg.split("=").slice(1).join("=");
    } else if (arg.startsWith("--street=")) {
      result.data.address = result.data.address || {};
      result.data.address.street = arg.split("=").slice(1).join("=");
    } else if (arg.startsWith("--city=")) {
      result.data.address = result.data.address || {};
      result.data.address.city = arg.split("=").slice(1).join("=");
    } else if (arg.startsWith("--zip=")) {
      result.data.address = result.data.address || {};
      result.data.address.zipCode = arg.split("=")[1];
    } else if (arg.startsWith("--country=")) {
      result.data.address = result.data.address || {};
      result.data.address.country = arg.split("=").slice(1).join("=");
    } else if (arg.startsWith("--notice=")) {
      result.data.notice = arg.split("=").slice(1).join("=");
    }
  }

  return result;
}

function showHelp(): void {
  console.log(`
Aktualizace firmy v Raynet CRM

Usage:
  npx tsx update-company.ts <ID> [options]

Povinné parametry:
  ID                    ID firmy k aktualizaci

Volitelné parametry:
  --name=TEXT           Název firmy
  --ico=TEXT            IČO
  --dic=TEXT            DIČ
  --owner=ID            ID vlastníka
  --owner-name=NAME     Jméno vlastníka (automaticky najde ID)
  --rating=VALUE        Rating (A, B, C, ...)
  --state=VALUE         Stav
  --role=VALUE          Role (A_POTENTIAL, B_ACTUAL, ...)
  --category=ID         ID kategorie
  --email=TEXT          Email
  --tel=TEXT            Telefon
  --www=TEXT            Webová stránka
  --street=TEXT         Ulice
  --city=TEXT           Město
  --zip=TEXT            PSČ
  --country=TEXT        Země
  --notice=TEXT         Poznámka

Příklady:
  npx tsx update-company.ts 123 --name="Nový název firmy"
  npx tsx update-company.ts 123 --email=novy@email.cz --tel=123456789
  npx tsx update-company.ts 123 --role=B_ACTUAL --owner-name="Roman Kytka"
`);
}

async function main() {
  const { id, data, help, ownerName } = parseArgs();

  if (help) {
    showHelp();
    return;
  }

  if (!id) {
    console.error("Chyba: ID firmy je povinný parametr");
    console.error("Použij --help pro zobrazení nápovědy");
    process.exit(1);
  }

  if (Object.keys(data).length === 0) {
    console.error("Chyba: Musíš zadat alespoň jeden parametr k aktualizaci");
    console.error("Použij --help pro zobrazení nápovědy");
    process.exit(1);
  }

  const client = RaynetClient.createFromCredentialsFile();

  // Resolve owner name to ID
  if (ownerName && !data.owner) {
    const ownerId = await client.findOwnerId(ownerName);
    if (ownerId) {
      data.owner = ownerId;
    } else {
      console.error(`Varování: Vlastník "${ownerName}" nenalezen`);
    }
  }

  await client.updateCompany(id, data);

  console.log(`✓ Firma ${id} aktualizována`);
  console.log(`  URL: https://app.raynet.cz/${client.instanceName}/?view=DetailView&en=Company&ei=${id}`);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
