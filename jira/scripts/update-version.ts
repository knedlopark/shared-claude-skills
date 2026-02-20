#!/usr/bin/env npx tsx
/**
 * Úprava existující verze
 *
 * Použití:
 *   npx tsx update-version.ts <PROJECT> <VERSION-NAME> [options]
 *
 * Příklady:
 *   npx tsx update-version.ts INFD "v2.0.0" --name="v2.0.1"
 *   npx tsx update-version.ts INFD "v2.0.0" --description="Updated description"
 *   npx tsx update-version.ts INFD "v2.0.0" --archive
 *   npx tsx update-version.ts INFD "v2.0.0" --unarchive
 */

import { getVersionByName, updateVersion, archiveVersion, unarchiveVersion } from "./lib/jira-versions.js";

const args = process.argv.slice(2);

// Parse argumentů
const positionalArgs = args.filter((a) => !a.startsWith("--"));
const projectKey = positionalArgs[0];
const versionName = positionalArgs[1];

function getArg(name: string): string | undefined {
  const arg = args.find((a) => a.startsWith(`--${name}=`));
  return arg?.split("=").slice(1).join("=");
}

const newName = getArg("name");
const description = getArg("description");
const startDate = getArg("start-date");
const releaseDate = getArg("release-date");
const doArchive = args.includes("--archive");
const doUnarchive = args.includes("--unarchive");

if (!projectKey || !versionName) {
  console.error("Použití: npx tsx update-version.ts <PROJECT> <VERSION-NAME> [options]");
  console.error("");
  console.error("Argumenty:");
  console.error("  <PROJECT>       Klíč projektu (např. INFD)");
  console.error("  <VERSION-NAME>  Název verze k úpravě");
  console.error("");
  console.error("Volitelné:");
  console.error("  --name=\"...\"            Nový název verze");
  console.error("  --description=\"...\"     Nový popis");
  console.error("  --start-date=YYYY-MM-DD Nové datum zahájení");
  console.error("  --release-date=YYYY-MM-DD Nové datum vydání");
  console.error("  --archive               Archivovat verzi");
  console.error("  --unarchive             Odarchivovat verzi");
  console.error("");
  console.error("Příklady:");
  console.error("  npx tsx update-version.ts INFD \"v2.0.0\" --name=\"v2.0.1\"");
  console.error("  npx tsx update-version.ts INFD \"v2.0.0\" --archive");
  process.exit(1);
}

// Validace
if (doArchive && doUnarchive) {
  console.error("Chyba: Nelze použít --archive a --unarchive současně.");
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
    // Najdeme verzi podle názvu
    const version = await getVersionByName(projectKey, versionName);

    if (!version) {
      console.error(`Chyba: Verze "${versionName}" v projektu ${projectKey} nebyla nalezena.`);
      process.exit(1);
    }

    let updated;

    if (doArchive) {
      updated = await archiveVersion(version.id, projectKey);
      console.log(`✓ Verze "${versionName}" byla archivována`);
    } else if (doUnarchive) {
      updated = await unarchiveVersion(version.id, projectKey);
      console.log(`✓ Verze "${versionName}" byla odarchivována`);
    } else {
      // Běžná aktualizace
      const updateData: Record<string, unknown> = {};
      const changes: string[] = [];

      if (newName !== undefined) {
        updateData.name = newName;
        changes.push(`Název: ${versionName} → ${newName}`);
      }
      if (description !== undefined) {
        updateData.description = description;
        changes.push(`Popis: ${description}`);
      }
      if (startDate !== undefined) {
        updateData.startDate = startDate;
        changes.push(`Datum zahájení: ${startDate}`);
      }
      if (releaseDate !== undefined) {
        updateData.releaseDate = releaseDate;
        changes.push(`Datum vydání: ${releaseDate}`);
      }

      if (Object.keys(updateData).length === 0) {
        console.error("Chyba: Nebyla zadána žádná změna.");
        console.error("Použijte --name, --description, --start-date, --release-date, --archive nebo --unarchive");
        process.exit(1);
      }

      updated = await updateVersion(version.id, updateData, projectKey);
      console.log(`✓ Verze "${versionName}" byla aktualizována`);
      console.log("");
      changes.forEach((c) => console.log(`  ${c}`));
    }

    console.log("");
    console.log("Aktuální stav:");
    console.log(`  ID:           ${updated.id}`);
    console.log(`  Název:        ${updated.name}`);
    if (updated.description) console.log(`  Popis:        ${updated.description}`);
    if (updated.startDate) console.log(`  Datum zahájení: ${updated.startDate}`);
    if (updated.releaseDate) console.log(`  Datum vydání: ${updated.releaseDate}`);
    console.log(`  Released:     ${updated.released ? "Ano" : "Ne"}`);
    console.log(`  Archived:     ${updated.archived ? "Ano" : "Ne"}`);
  } catch (error) {
    console.error("Chyba:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
