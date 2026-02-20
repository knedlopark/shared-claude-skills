/**
 * Vytvoření obchodního případu v Raynet CRM
 *
 * Usage:
 *   npx tsx ./skills/raynet/scripts/create-business-case.ts --name="Projekt ABC" --company=123
 *   npx tsx ./skills/raynet/scripts/create-business-case.ts --name="Nový OP" --company=123 --amount=50000
 */

import { RaynetClient, CreateBusinessCaseRequest } from "./lib/raynet-client.js";

interface ParsedArgs extends CreateBusinessCaseRequest {
  help?: boolean;
  ownerName?: string;
}

function parseArgs(): ParsedArgs {
  const args = process.argv.slice(2);
  const result: ParsedArgs = {
    name: "",
  };

  for (const arg of args) {
    if (arg === "--help" || arg === "-h") {
      result.help = true;
    } else if (arg.startsWith("--name=")) {
      result.name = arg.split("=").slice(1).join("=");
    } else if (arg.startsWith("--company=")) {
      result.company = parseInt(arg.split("=")[1], 10);
    } else if (arg.startsWith("--person=")) {
      result.person = parseInt(arg.split("=")[1], 10);
    } else if (arg.startsWith("--owner=")) {
      result.owner = parseInt(arg.split("=")[1], 10);
    } else if (arg.startsWith("--owner-name=")) {
      result.ownerName = arg.split("=").slice(1).join("=");
    } else if (arg.startsWith("--phase=")) {
      result.businessCasePhase = parseInt(arg.split("=")[1], 10);
    } else if (arg.startsWith("--category=")) {
      result.category = parseInt(arg.split("=")[1], 10);
    } else if (arg.startsWith("--source=")) {
      result.source = parseInt(arg.split("=")[1], 10);
    } else if (arg.startsWith("--amount=")) {
      result.totalAmount = parseFloat(arg.split("=")[1]);
    } else if (arg.startsWith("--currency=")) {
      result.currency = parseInt(arg.split("=")[1], 10);
    } else if (arg.startsWith("--scheduled-end=")) {
      result.scheduledEnd = arg.split("=")[1];
    } else if (arg.startsWith("--valid-from=")) {
      result.validFrom = arg.split("=")[1];
    } else if (arg.startsWith("--valid-till=")) {
      result.validTill = arg.split("=")[1];
    } else if (arg.startsWith("--description=")) {
      result.description = arg.split("=").slice(1).join("=");
    } else if (arg.startsWith("--custom-field=")) {
      // Format: --custom-field="KEY=VALUE"
      const fieldValue = arg.split("=").slice(1).join("=");
      const separatorIndex = fieldValue.indexOf("=");
      if (separatorIndex > 0) {
        const key = fieldValue.substring(0, separatorIndex);
        let value: unknown = fieldValue.substring(separatorIndex + 1);
        // Parse boolean and number values
        if (value === "true") value = true;
        else if (value === "false") value = false;
        else if (!isNaN(Number(value)) && value !== "") value = Number(value);
        result.customFields = result.customFields || {};
        result.customFields[key] = value;
      }
    }
  }

  return result;
}

function showHelp(): void {
  console.log(`
Vytvoření obchodního případu v Raynet CRM

Usage:
  npx tsx create-business-case.ts --name="..." [options]

Povinné parametry:
  --name=TEXT           Název obchodního případu

Volitelné parametry:
  --company=ID          ID firmy
  --person=ID           ID kontaktu
  --owner=ID            ID vlastníka
  --owner-name=NAME     Jméno vlastníka (automaticky najde ID)
  --phase=ID            ID fáze (viz get-enums.ts: Jednáme=2, TRIAL=9, Výhra=4, ...)
  --category=ID         ID kategorie OP (viz get-enums.ts)
  --source=ID           ID zdroje (viz get-enums.ts)
  --amount=NUMBER       Celková částka
  --currency=ID         ID měny (40=Kč, viz get-enums.ts)
  --scheduled-end=DATE  Plánované ukončení (YYYY-MM-DD)
  --valid-from=DATE     Platnost od (YYYY-MM-DD)
  --valid-till=DATE     Platnost do (YYYY-MM-DD)
  --description=TEXT    Popis
  --custom-field=K=V    Vlastní pole (lze použít vícekrát)

Příklady:
  npx tsx create-business-case.ts --name="Projekt ABC" --company=123
  npx tsx create-business-case.ts --name="Nový OP" --company=123 --amount=50000 --owner-name="Roman Kytka"
  npx tsx create-business-case.ts --name="PI - Klient" --company=123 --phase=2 --category=116 --source=162
  npx tsx create-business-case.ts --name="OP" --company=123 --custom-field="Partner_0d407=true" --custom-field="Partner__n_051b4=Digiro"
`);
}

async function main() {
  const data = parseArgs();

  if (data.help) {
    showHelp();
    return;
  }

  if (!data.name) {
    console.error("Chyba: --name je povinný parametr");
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
  const { help, ownerName, ...bcData } = data;

  const result = await client.createBusinessCase(bcData);

  console.log(`✓ Obchodní případ vytvořen s ID: ${result.id}`);
  console.log(`  URL: https://app.raynet.cz/gimmedata/?view=DetailView&en=BusinessCase&ei=${result.id}`);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
