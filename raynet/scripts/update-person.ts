/**
 * Aktualizace kontaktu v Raynet CRM
 *
 * Usage:
 *   npx tsx ./skills/raynet/scripts/update-person.ts 123 --first-name="Jan" --last-name="Novák"
 *   npx tsx ./skills/raynet/scripts/update-person.ts 123 --email=jan@email.cz --tel=123456789
 */

import { RaynetClient, UpdatePersonRequest } from "./lib/raynet-client.js";

function parseArgs(): { id?: number; data: UpdatePersonRequest; help?: boolean; ownerName?: string } {
  const args = process.argv.slice(2);
  const result: { id?: number; data: UpdatePersonRequest; help?: boolean; ownerName?: string } = {
    data: {},
  };

  for (const arg of args) {
    if (arg === "--help" || arg === "-h") {
      result.help = true;
    } else if (!arg.startsWith("--") && !result.id) {
      result.id = parseInt(arg, 10);
    } else if (arg.startsWith("--first-name=")) {
      result.data.firstName = arg.split("=").slice(1).join("=");
    } else if (arg.startsWith("--last-name=")) {
      result.data.lastName = arg.split("=").slice(1).join("=");
    } else if (arg.startsWith("--title-before=")) {
      result.data.titleBefore = arg.split("=").slice(1).join("=");
    } else if (arg.startsWith("--title-after=")) {
      result.data.titleAfter = arg.split("=").slice(1).join("=");
    } else if (arg.startsWith("--owner=")) {
      result.data.owner = parseInt(arg.split("=")[1], 10);
    } else if (arg.startsWith("--owner-name=")) {
      result.ownerName = arg.split("=").slice(1).join("=");
    } else if (arg.startsWith("--category=")) {
      result.data.category = parseInt(arg.split("=")[1], 10);
    } else if (arg.startsWith("--email=")) {
      result.data.contactInfo = result.data.contactInfo || {};
      result.data.contactInfo.email = arg.split("=").slice(1).join("=");
    } else if (arg.startsWith("--email2=")) {
      result.data.contactInfo = result.data.contactInfo || {};
      result.data.contactInfo.email2 = arg.split("=").slice(1).join("=");
    } else if (arg.startsWith("--tel=") || arg.startsWith("--phone=")) {
      result.data.contactInfo = result.data.contactInfo || {};
      result.data.contactInfo.tel1 = arg.split("=")[1];
    } else if (arg.startsWith("--tel2=") || arg.startsWith("--phone2=")) {
      result.data.contactInfo = result.data.contactInfo || {};
      result.data.contactInfo.tel2 = arg.split("=")[1];
    } else if (arg.startsWith("--notice=")) {
      result.data.notice = arg.split("=").slice(1).join("=");
    }
  }

  return result;
}

function showHelp(): void {
  console.log(`
Aktualizace kontaktu v Raynet CRM

Usage:
  npx tsx update-person.ts <ID> [options]

Povinné parametry:
  ID                    ID kontaktu k aktualizaci

Volitelné parametry:
  --first-name=TEXT     Jméno
  --last-name=TEXT      Příjmení
  --title-before=TEXT   Titul před jménem
  --title-after=TEXT    Titul za jménem
  --owner=ID            ID vlastníka
  --owner-name=NAME     Jméno vlastníka (automaticky najde ID)
  --category=ID         ID kategorie
  --email=TEXT          Primární email
  --email2=TEXT         Sekundární email
  --tel=TEXT            Primární telefon
  --tel2=TEXT           Sekundární telefon
  --notice=TEXT         Poznámka

Příklady:
  npx tsx update-person.ts 123 --first-name="Jan" --last-name="Novák"
  npx tsx update-person.ts 123 --email=jan@email.cz --tel=123456789
  npx tsx update-person.ts 123 --owner-name="Roman Kytka" --notice="VIP kontakt"
`);
}

async function main() {
  const { id, data, help, ownerName } = parseArgs();

  if (help) {
    showHelp();
    return;
  }

  if (!id) {
    console.error("Chyba: ID kontaktu je povinný parametr");
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

  await client.updatePerson(id, data);

  console.log(`✓ Kontakt ${id} aktualizován`);
  console.log(`  URL: https://app.raynet.cz/${client.instanceName}/?view=DetailView&en=Person&ei=${id}`);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
