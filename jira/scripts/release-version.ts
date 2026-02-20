#!/usr/bin/env npx tsx
/**
 * Označení verze jako released
 *
 * Použití:
 *   npx tsx release-version.ts <PROJECT> <VERSION-NAME> [--date=YYYY-MM-DD]
 *
 * Příklady:
 *   npx tsx release-version.ts INFD "v2.0.0"
 *   npx tsx release-version.ts INFD "v2.0.0" --date=2025-01-15
 */

import { getVersionByName, releaseVersion } from "./lib/jira-versions.js";

const args = process.argv.slice(2);

// Parse argumentů
const positionalArgs = args.filter((a) => !a.startsWith("--"));
const projectKey = positionalArgs[0];
const versionName = positionalArgs[1];

function getArg(name: string): string | undefined {
  const arg = args.find((a) => a.startsWith(`--${name}=`));
  return arg?.split("=").slice(1).join("=");
}

const releaseDate = getArg("date");

if (!projectKey || !versionName) {
  console.error("Použití: npx tsx release-version.ts <PROJECT> <VERSION-NAME> [--date=YYYY-MM-DD]");
  console.error("");
  console.error("Argumenty:");
  console.error("  <PROJECT>       Klíč projektu (např. INFD)");
  console.error("  <VERSION-NAME>  Název verze k vydání");
  console.error("");
  console.error("Volitelné:");
  console.error("  --date=YYYY-MM-DD  Datum vydání (výchozí: dnes)");
  console.error("");
  console.error("Příklady:");
  console.error("  npx tsx release-version.ts INFD \"v2.0.0\"");
  console.error("  npx tsx release-version.ts INFD \"v2.0.0\" --date=2025-01-15");
  process.exit(1);
}

// Validace formátu datumu
if (releaseDate && !/^\d{4}-\d{2}-\d{2}$/.test(releaseDate)) {
  console.error("Chyba: --date musí být ve formátu YYYY-MM-DD");
  process.exit(1);
}

async function main() {
  try {
    // Najdeme verzi podle názvu
    const version = await getVersionByName(projectKey, versionName);

    if (!version) {
      console.error(`Chyba: Verze "${versionName}" v projektu ${projectKey} nebyla nalezena.`);
      process.exit(1);
    }

    if (version.released) {
      console.log(`Verze "${versionName}" je již vydaná (${version.releaseDate}).`);
      process.exit(0);
    }

    const updated = await releaseVersion(version.id, releaseDate, projectKey);

    console.log(`✓ Verze "${updated.name}" byla vydána`);
    console.log("");
    console.log(`  Projekt:        ${projectKey}`);
    console.log(`  Datum vydání:   ${updated.releaseDate}`);
  } catch (error) {
    console.error("Chyba:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
