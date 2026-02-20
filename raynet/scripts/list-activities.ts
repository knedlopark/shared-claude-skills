/**
 * Seznam aktivit z Raynet CRM
 *
 * Usage:
 *   npx tsx ./skills/raynet/scripts/list-activities.ts
 *   npx tsx ./skills/raynet/scripts/list-activities.ts --company=123
 *   npx tsx ./skills/raynet/scripts/list-activities.ts --person=456
 *   npx tsx ./skills/raynet/scripts/list-activities.ts --limit=10 --json
 */

import { RaynetClient, Activity } from "./lib/raynet-client.js";

function parseArgs() {
  const args = process.argv.slice(2);
  let companyId: number | undefined;
  let personId: number | undefined;
  let limit = 50;
  let json = false;

  for (const arg of args) {
    if (arg.startsWith("--company=")) {
      companyId = parseInt(arg.split("=")[1], 10);
    } else if (arg.startsWith("--person=")) {
      personId = parseInt(arg.split("=")[1], 10);
    } else if (arg.startsWith("--limit=")) {
      limit = parseInt(arg.split("=")[1], 10);
    } else if (arg === "--json") {
      json = true;
    }
  }

  return { companyId, personId, limit, json };
}

function formatActivity(activity: Activity): void {
  const status = activity.status ? `[${activity.status}]` : "";
  const priority = activity.priority && activity.priority !== "DEFAULT" ? `(${activity.priority})` : "";

  console.log(`[${activity.id}] ${activity.title} ${status} ${priority}`.trim());

  if (activity.company) console.log(`    Firma: ${activity.company.name}`);
  if (activity.person) console.log(`    Kontakt: ${activity.person.fullName}`);
  if (activity.scheduledFrom) console.log(`    Od: ${activity.scheduledFrom}`);
  if (activity.scheduledTill) console.log(`    Do: ${activity.scheduledTill}`);
  if (activity.owner) console.log(`    Owner: ${activity.owner.fullName}`);
  if (activity.category) console.log(`    Kategorie: ${activity.category.value}`);
  console.log("");
}

async function main() {
  const { companyId, personId, limit, json } = parseArgs();

  const client = RaynetClient.createFromCredentialsFile();
  const result = await client.listActivities({
    companyId,
    personId,
    limit,
  });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(`Nalezeno ${result.totalCount} aktivit (zobrazuji ${result.data.length}):\n`);

  if (result.data.length === 0) {
    console.log("Žádné aktivity nenalezeny.");
    return;
  }

  for (const activity of result.data) {
    formatActivity(activity);
  }
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
