/**
 * Přehled počtu všech Raynet entit
 *
 * Usage:
 *   npx tsx ./skills/raynet/scripts/entity-stats.ts
 *   npx tsx ./skills/raynet/scripts/entity-stats.ts --json
 */

import { RaynetClient } from "./lib/raynet-client.js";

const ENTITIES = [
  "company",
  "person",
  "lead",
  "businessCase",
  "activity",
  "task",
  "offer",
  "order",
  "invoice",
  "product",
  "priceList",
  "project",
  "email",
  "meeting",
  "phoneCall",
  "gdprForm",
];

interface EntityStat {
  entity: string;
  count: number | string;
}

async function main() {
  const args = process.argv.slice(2);
  const jsonOutput = args.includes("--json");

  const client = RaynetClient.createFromCredentialsFile();
  const results: EntityStat[] = [];

  if (!jsonOutput) {
    console.log("Načítám statistiky Raynet entit...\n");
  }

  for (const entity of ENTITIES) {
    try {
      const response = await client.apiRequest<{ totalCount?: number }>("GET", `/${entity}/?limit=1`);
      results.push({ entity, count: response.totalCount ?? 0 });
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message?.substring(0, 50) : "unknown";
      results.push({ entity, count: `Error: ${errorMessage}` });
    }
  }

  // Sort by count (numbers first, descending)
  results.sort((a, b) => {
    if (typeof a.count === "number" && typeof b.count === "number") return b.count - a.count;
    if (typeof a.count === "number") return -1;
    if (typeof b.count === "number") return 1;
    return 0;
  });

  if (jsonOutput) {
    console.log(JSON.stringify(results, null, 2));
  } else {
    console.log("Entity                Count");
    console.log("─".repeat(40));
    for (const { entity, count } of results) {
      const countStr = typeof count === "number" ? count.toLocaleString("cs-CZ") : count;
      console.log(`${entity.padEnd(20)} ${countStr}`);
    }
    console.log("─".repeat(40));

    const total = results.reduce((sum, r) => sum + (typeof r.count === "number" ? r.count : 0), 0);
    console.log(`${"TOTAL".padEnd(20)} ${total.toLocaleString("cs-CZ")}`);
  }
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
