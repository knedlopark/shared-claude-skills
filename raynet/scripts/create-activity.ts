/**
 * Vytvoření aktivity v Raynet CRM
 *
 * Usage:
 *   npx tsx ./skills/raynet/scripts/create-activity.ts --title="Schůzka" --company=123
 *   npx tsx ./skills/raynet/scripts/create-activity.ts --title="Telefonát" --person=456 --priority=HIGH
 *   npx tsx ./skills/raynet/scripts/create-activity.ts --title="Meeting" --company=123 --from="2025-01-15 10:00" --till="2025-01-15 11:00"
 */

import { RaynetClient, CreateActivityRequest } from "./lib/raynet-client.js";

function parseArgs(): CreateActivityRequest & { help?: boolean } {
  const args = process.argv.slice(2);
  const result: CreateActivityRequest & { help?: boolean } = {
    title: "",
  };

  for (const arg of args) {
    if (arg === "--help" || arg === "-h") {
      result.help = true;
    } else if (arg.startsWith("--title=")) {
      result.title = arg.split("=").slice(1).join("=");
    } else if (arg.startsWith("--company=")) {
      result.company = parseInt(arg.split("=")[1], 10);
    } else if (arg.startsWith("--person=")) {
      result.person = parseInt(arg.split("=")[1], 10);
    } else if (arg.startsWith("--owner=")) {
      result.owner = parseInt(arg.split("=")[1], 10);
    } else if (arg.startsWith("--category=")) {
      result.category = parseInt(arg.split("=")[1], 10);
    } else if (arg.startsWith("--from=")) {
      result.scheduledFrom = arg.split("=").slice(1).join("=");
    } else if (arg.startsWith("--till=")) {
      result.scheduledTill = arg.split("=").slice(1).join("=");
    } else if (arg.startsWith("--description=")) {
      result.description = arg.split("=").slice(1).join("=");
    } else if (arg.startsWith("--priority=")) {
      const priority = arg.split("=")[1].toUpperCase();
      if (priority === "HIGH" || priority === "HIGHEST" || priority === "DEFAULT") {
        result.priority = priority;
      }
    }
  }

  return result;
}

function showHelp(): void {
  console.log(`
Vytvoření aktivity v Raynet CRM

Usage:
  npx tsx create-activity.ts --title="..." [options]

Povinné parametry:
  --title=TEXT        Název aktivity

Volitelné parametry:
  --company=ID        ID firmy
  --person=ID         ID kontaktu
  --owner=ID          ID vlastníka (owner)
  --category=ID       ID kategorie
  --from=DATETIME     Začátek (formát: "YYYY-MM-DD HH:mm")
  --till=DATETIME     Konec (formát: "YYYY-MM-DD HH:mm")
  --description=TEXT  Popis
  --priority=LEVEL    Priorita: DEFAULT, HIGH, HIGHEST

Příklady:
  npx tsx create-activity.ts --title="Schůzka s klientem" --company=123
  npx tsx create-activity.ts --title="Follow-up telefonát" --person=456 --priority=HIGH
  npx tsx create-activity.ts --title="Meeting" --company=123 --from="2025-01-15 10:00" --till="2025-01-15 11:00"
`);
}

async function main() {
  const data = parseArgs();

  if (data.help) {
    showHelp();
    return;
  }

  if (!data.title) {
    console.error("Chyba: --title je povinný parametr");
    console.error("Použij --help pro zobrazení nápovědy");
    process.exit(1);
  }

  const client = RaynetClient.createFromCredentialsFile();

  // Remove help from data before sending
  const { help, ...activityData } = data;

  const result = await client.createActivity(activityData);

  console.log(`✓ Aktivita vytvořena s ID: ${result.id}`);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
