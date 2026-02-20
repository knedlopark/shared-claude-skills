#!/usr/bin/env npx tsx
/**
 * Vytvoření nové verze v projektu
 *
 * Použití:
 *   npx tsx create-version.ts <PROJECT> --name="v1.0.0" [--description="..."] [--start-date=YYYY-MM-DD] [--release-date=YYYY-MM-DD]
 *
 * Příklady:
 *   npx tsx create-version.ts INFD --name="v2.0.0"
 *   npx tsx create-version.ts INFD --name="v2.0.0" --description="Major release"
 *   npx tsx create-version.ts INFD --name="v2.0.0" --start-date=2025-01-01 --release-date=2025-02-01
 */

import { createVersion, getVersionByName } from "./lib/jira-versions.js";

const args = process.argv.slice(2);

// Parse argumentů
const projectKey = args.find((a) => !a.startsWith("--"));

function getArg(name: string): string | undefined {
  const arg = args.find((a) => a.startsWith(`--${name}=`));
  return arg?.split("=").slice(1).join("=");
}

const name = getArg("name");
const description = getArg("description");
const startDate = getArg("start-date");
const releaseDate = getArg("release-date");

if (!projectKey || !name) {
  console.error("Použití: npx tsx create-version.ts <PROJECT> --name=\"v1.0.0\" [options]");
  console.error("");
  console.error("Povinné:");
  console.error("  <PROJECT>              Klíč projektu (např. INFD)");
  console.error("  --name=\"...\"           Název verze");
  console.error("");
  console.error("Volitelné:");
  console.error("  --description=\"...\"    Popis verze");
  console.error("  --start-date=YYYY-MM-DD  Datum zahájení");
  console.error("  --release-date=YYYY-MM-DD  Plánované datum vydání");
  console.error("");
  console.error("Příklady:");
  console.error("  npx tsx create-version.ts INFD --name=\"v2.0.0\"");
  console.error("  npx tsx create-version.ts INFD --name=\"v2.0.0\" --description=\"Major release\"");
  process.exit(1);
}

// Validace formátu datumu
function validateDate(date: string | undefined, fieldName: string): void {
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    console.error(`Chyba: ${fieldName} musí být ve formátu YYYY-MM-DD`);
    process.exit(1);
  }
}

validateDate(startDate, "start-date");
validateDate(releaseDate, "release-date");

async function main() {
  try {
    // Zkontrolujeme, zda verze již existuje
    const existing = await getVersionByName(projectKey, name);
    if (existing) {
      console.error(`Chyba: Verze "${name}" v projektu ${projectKey} již existuje.`);
      process.exit(1);
    }

    const version = await createVersion(projectKey, {
      name,
      description,
      startDate,
      releaseDate,
    });

    console.log(`✓ Verze "${version.name}" vytvořena v projektu ${projectKey}`);
    console.log("");
    console.log(`  ID:           ${version.id}`);
    if (version.description) console.log(`  Popis:        ${version.description}`);
    if (version.startDate) console.log(`  Datum zahájení: ${version.startDate}`);
    if (version.releaseDate) console.log(`  Plánované vydání: ${version.releaseDate}`);
    console.log(`  Released:     ${version.released ? "Ano" : "Ne"}`);
    console.log(`  Archived:     ${version.archived ? "Ano" : "Ne"}`);
  } catch (error) {
    console.error("Chyba:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
