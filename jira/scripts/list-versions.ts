#!/usr/bin/env npx tsx
/**
 * Seznam verzí projektu
 *
 * Použití:
 *   npx tsx list-versions.ts <PROJECT> [--released] [--unreleased] [--archived] [--json]
 *
 * Příklady:
 *   npx tsx list-versions.ts INFD
 *   npx tsx list-versions.ts INFD --released
 *   npx tsx list-versions.ts INFD --unreleased
 *   npx tsx list-versions.ts INFD --json
 */

import { getVersions, formatVersion, JiraVersion } from "./lib/jira-versions.js";

const args = process.argv.slice(2);

// Parse argumentů
const projectKey = args.find((a) => !a.startsWith("--"));
const showReleased = args.includes("--released");
const showUnreleased = args.includes("--unreleased");
const showArchived = args.includes("--archived");
const jsonOutput = args.includes("--json");

if (!projectKey) {
  console.error("Použití: npx tsx list-versions.ts <PROJECT> [--released] [--unreleased] [--archived] [--json]");
  console.error("");
  console.error("Příklady:");
  console.error("  npx tsx list-versions.ts INFD");
  console.error("  npx tsx list-versions.ts INFD --released");
  console.error("  npx tsx list-versions.ts INFD --unreleased");
  process.exit(1);
}

async function main() {
  try {
    let versions = await getVersions(projectKey);

    // Filtrování
    if (showReleased) {
      versions = versions.filter((v) => v.released);
    } else if (showUnreleased) {
      versions = versions.filter((v) => !v.released);
    }

    if (!showArchived) {
      versions = versions.filter((v) => !v.archived);
    }

    // Seřazení - released na konci, pak podle názvu
    versions.sort((a, b) => {
      if (a.released !== b.released) return a.released ? 1 : -1;
      return a.name.localeCompare(b.name);
    });

    if (jsonOutput) {
      console.log(JSON.stringify(versions, null, 2));
      return;
    }

    if (versions.length === 0) {
      console.log(`Projekt ${projectKey} nemá žádné verze.`);
      return;
    }

    console.log(`=== Verze projektu ${projectKey} ===`);
    console.log("");

    // Rozdělení na kategorie
    const unreleased = versions.filter((v) => !v.released);
    const released = versions.filter((v) => v.released);

    if (unreleased.length > 0) {
      console.log("Nevydané verze:");
      unreleased.forEach((v) => console.log(formatVersion(v)));
      console.log("");
    }

    if (released.length > 0) {
      console.log("Vydané verze:");
      released.forEach((v) => console.log(formatVersion(v)));
    }

    console.log("");
    console.log(`Celkem: ${versions.length} verzí (${unreleased.length} nevydaných, ${released.length} vydaných)`);
  } catch (error) {
    console.error("Chyba:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
