/**
 * Aktualizace obchodního případu v Raynet CRM
 *
 * Usage:
 *   npx tsx ./skills/raynet/scripts/update-business-case.ts 123 --name="Nový název"
 *   npx tsx ./skills/raynet/scripts/update-business-case.ts 123 --amount=100000 --phase=5
 */

import { RaynetClient, UpdateBusinessCaseRequest } from "./lib/raynet-client.js";

function parseArgs(): { id?: number; data: UpdateBusinessCaseRequest; help?: boolean; ownerName?: string } {
  const args = process.argv.slice(2);
  const result: { id?: number; data: UpdateBusinessCaseRequest; help?: boolean; ownerName?: string } = {
    data: {},
  };

  for (const arg of args) {
    if (arg === "--help" || arg === "-h") {
      result.help = true;
    } else if (!arg.startsWith("--") && !result.id) {
      result.id = parseInt(arg, 10);
    } else if (arg.startsWith("--name=")) {
      result.data.name = arg.split("=").slice(1).join("=");
    } else if (arg.startsWith("--company=")) {
      result.data.company = parseInt(arg.split("=")[1], 10);
    } else if (arg.startsWith("--person=")) {
      result.data.person = parseInt(arg.split("=")[1], 10);
    } else if (arg.startsWith("--owner=")) {
      result.data.owner = parseInt(arg.split("=")[1], 10);
    } else if (arg.startsWith("--owner-name=")) {
      result.ownerName = arg.split("=").slice(1).join("=");
    } else if (arg.startsWith("--phase=")) {
      result.data.businessCasePhase = parseInt(arg.split("=")[1], 10);
    } else if (arg.startsWith("--amount=")) {
      result.data.totalAmount = parseFloat(arg.split("=")[1]);
    } else if (arg.startsWith("--currency=")) {
      result.data.currency = parseInt(arg.split("=")[1], 10);
    } else if (arg.startsWith("--scheduled-end=")) {
      result.data.scheduledEnd = arg.split("=")[1];
    } else if (arg.startsWith("--valid-from=")) {
      result.data.validFrom = arg.split("=")[1];
    } else if (arg.startsWith("--valid-till=")) {
      result.data.validTill = arg.split("=")[1];
    } else if (arg.startsWith("--description=")) {
      result.data.description = arg.split("=").slice(1).join("=");
    }
  }

  return result;
}

function showHelp(): void {
  console.log(`
Aktualizace obchodního případu v Raynet CRM

Usage:
  npx tsx update-business-case.ts <ID> [options]

Povinné parametry:
  ID                    ID obchodního případu k aktualizaci

Volitelné parametry:
  --name=TEXT           Název obchodního případu
  --company=ID          ID firmy
  --person=ID           ID kontaktu
  --owner=ID            ID vlastníka
  --owner-name=NAME     Jméno vlastníka (automaticky najde ID)
  --phase=ID            ID fáze obchodního případu
  --amount=NUMBER       Celková částka
  --currency=ID         ID měny (1=CZK, 2=EUR, ...)
  --scheduled-end=DATE  Plánované ukončení (YYYY-MM-DD)
  --valid-from=DATE     Platnost od (YYYY-MM-DD)
  --valid-till=DATE     Platnost do (YYYY-MM-DD)
  --description=TEXT    Popis

Příklady:
  npx tsx update-business-case.ts 123 --name="Nový název"
  npx tsx update-business-case.ts 123 --amount=100000 --phase=5
  npx tsx update-business-case.ts 123 --owner-name="Roman Kytka" --scheduled-end=2025-06-30
`);
}

async function main() {
  const { id, data, help, ownerName } = parseArgs();

  if (help) {
    showHelp();
    return;
  }

  if (!id) {
    console.error("Chyba: ID obchodního případu je povinný parametr");
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

  await client.updateBusinessCase(id, data);

  console.log(`✓ Obchodní případ ${id} aktualizován`);
  console.log(`  URL: https://app.raynet.cz/${client.instanceName}/?view=DetailView&en=BusinessCase&ei=${id}`);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
