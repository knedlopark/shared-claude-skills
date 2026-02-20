/**
 * Vyhledání leadů v Raynet CRM s podporou řazení a filtrování
 *
 * Usage:
 *   npx tsx ./skills/raynet/scripts/search-lead.ts "téma"
 *   npx tsx ./skills/raynet/scripts/search-lead.ts --all --sort=rowInfo.createdAt --order=DESC
 *   npx tsx ./skills/raynet/scripts/search-lead.ts --owner-name="Roman Kytka" --limit=50
 *   npx tsx ./skills/raynet/scripts/search-lead.ts --created-after=2024-01-01 --json
 */

import {
  RaynetClient,
  LeadSearchOptions,
  LeadSortColumn,
  SortDirection,
} from "./lib/raynet-client.js";

interface ParsedArgs {
  fulltext?: string;
  limit: number;
  offset: number;
  sortColumn?: LeadSortColumn;
  sortDirection: SortDirection;
  json: boolean;
  all: boolean;
  // Filtry
  owner?: number;
  ownerName?: string;
  leadPhase?: number;
  tags?: string;
  excludeTags?: string;
  contactSource?: number;
  createdAfter?: string;
  createdBefore?: string;
  updatedAfter?: string;
  updatedBefore?: string;
}

function parseArgs(): ParsedArgs {
  const args = process.argv.slice(2);
  const result: ParsedArgs = {
    limit: 20,
    offset: 0,
    sortDirection: "ASC",
    json: false,
    all: false,
  };

  for (const arg of args) {
    if (arg.startsWith("--limit=")) {
      result.limit = parseInt(arg.split("=")[1], 10);
    } else if (arg.startsWith("--offset=")) {
      result.offset = parseInt(arg.split("=")[1], 10);
    } else if (arg.startsWith("--sort=")) {
      result.sortColumn = arg.split("=")[1] as LeadSortColumn;
    } else if (arg.startsWith("--order=")) {
      result.sortDirection = arg.split("=")[1].toUpperCase() as SortDirection;
    } else if (arg.startsWith("--owner=")) {
      result.owner = parseInt(arg.split("=")[1], 10);
    } else if (arg.startsWith("--owner-name=")) {
      result.ownerName = arg.split("=")[1];
    } else if (arg.startsWith("--lead-phase=") || arg.startsWith("--phase=")) {
      result.leadPhase = parseInt(arg.split("=")[1], 10);
    } else if (arg.startsWith("--tags=")) {
      result.tags = arg.split("=")[1];
    } else if (arg.startsWith("--exclude-tags=")) {
      result.excludeTags = arg.split("=")[1];
    } else if (arg.startsWith("--contact-source=")) {
      result.contactSource = parseInt(arg.split("=")[1], 10);
    } else if (arg.startsWith("--created-after=")) {
      result.createdAfter = arg.split("=")[1];
    } else if (arg.startsWith("--created-before=")) {
      result.createdBefore = arg.split("=")[1];
    } else if (arg.startsWith("--updated-after=")) {
      result.updatedAfter = arg.split("=")[1];
    } else if (arg.startsWith("--updated-before=")) {
      result.updatedBefore = arg.split("=")[1];
    } else if (arg === "--json") {
      result.json = true;
    } else if (arg === "--all") {
      result.all = true;
    } else if (!arg.startsWith("-")) {
      result.fulltext = arg;
    }
  }

  return result;
}

function printHelp() {
  console.log(`
Vyhledání leadů v Raynet CRM

Usage:
  npx tsx search-lead.ts [query] [options]

Základní:
  query                   Fulltextové vyhledávání
  --all                   Vypsat všechny leady (bez filtrů)
  --limit=N               Max počet výsledků (default: 20, max: 1000)
  --offset=N              Přeskočit prvních N výsledků
  --json                  Výstup v JSON formátu

Řazení:
  --sort=COLUMN           Sloupec pro řazení:
                          id, topic, priority,
                          rowInfo.createdAt, rowInfo.updatedAt
  --order=ASC|DESC        Směr řazení (default: ASC)

Filtry:
  --owner=ID              Filtr podle vlastníka (ID)
  --owner-name=NAME       Filtr podle vlastníka (jméno - automaticky najde ID)
  --phase=ID              Filtr podle fáze leadu
  --contact-source=ID     Filtr podle zdroje kontaktu (např. 251=LEADY.CZ)
  --tags=TAG1,TAG2        Filtr podle tagů (OR logika)
  --exclude-tags=TAG1,TAG2  Vyloučit leady s těmito tagy (lokální filtr)

Datumové filtry (formát: YYYY-MM-DD):
  --created-after=DATE    Vytvořeno po datu
  --created-before=DATE   Vytvořeno před datem
  --updated-after=DATE    Upraveno po datu
  --updated-before=DATE   Upraveno před datem

Příklady:
  # Všechny leady seřazené podle data vytvoření (nejnovější první)
  npx tsx search-lead.ts --all --sort=rowInfo.createdAt --order=DESC

  # Fulltext vyhledávání
  npx tsx search-lead.ts "projekt" --limit=10

  # Leady konkrétního obchodníka
  npx tsx search-lead.ts --owner-name="Roman Kytka" --sort=rowInfo.createdAt --order=DESC

  # Leady vytvořené v roce 2024
  npx tsx search-lead.ts --created-after=2024-01-01 --created-before=2025-01-01
`);
}

async function main() {
  const args = parseArgs();

  // Zobraz nápovědu pokud je --help
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    printHelp();
    return;
  }

  // Pokud nejsou žádné filtry ani fulltext a není --all, zobraz nápovědu
  const hasFilters =
    args.fulltext ||
    args.owner ||
    args.ownerName ||
    args.leadPhase ||
    args.contactSource ||
    args.tags ||
    args.excludeTags ||
    args.createdAfter ||
    args.createdBefore ||
    args.updatedAfter ||
    args.updatedBefore;

  if (!hasFilters && !args.all) {
    console.error("Chyba: Musíš zadat alespoň jeden filtr, fulltextový dotaz, nebo --all.\n");
    printHelp();
    process.exit(1);
  }

  const client = RaynetClient.createFromCredentialsFile();

  // Převeď owner-name na owner ID
  let ownerId = args.owner;
  if (args.ownerName && !ownerId) {
    const foundId = await client.findOwnerId(args.ownerName);
    if (!foundId) {
      console.error(`Chyba: Vlastník "${args.ownerName}" nenalezen v Raynetu.`);
      process.exit(1);
    }
    ownerId = foundId;
  }

  const options: LeadSearchOptions = {
    fulltext: args.fulltext,
    limit: args.excludeTags ? 1000 : args.limit, // Při exclude-tags stáhneme více pro lokální filtrování
    offset: args.offset,
    sortColumn: args.sortColumn,
    sortDirection: args.sortDirection,
    owner: ownerId,
    leadPhase: args.leadPhase,
    contactSource: args.contactSource,
    tags: args.tags,
    createdAfter: args.createdAfter,
    createdBefore: args.createdBefore,
    updatedAfter: args.updatedAfter,
    updatedBefore: args.updatedBefore,
  };

  let result = await client.searchLeads(options);

  // Lokální filtrování pro --exclude-tags (Raynet API nepodporuje negativní filtr)
  if (args.excludeTags) {
    const tagsToExclude = args.excludeTags.split(",").map((t) => t.trim());
    const originalCount = result.data.length;
    result.data = result.data.filter((lead: any) => {
      const leadTags = lead.tags || [];
      return !tagsToExclude.some((tag) => leadTags.includes(tag));
    });
    // Aplikuj limit po filtrování
    if (result.data.length > args.limit) {
      result.data = result.data.slice(0, args.limit);
    }
    result.totalCount = result.data.length;
    if (!args.json) {
      console.log(`(Filtrováno lokálně: ${originalCount} → ${result.data.length} leadů bez tagů: ${args.excludeTags})\n`);
    }
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  const fromRecord = args.offset + 1;
  const toRecord = args.offset + result.data.length;
  console.log(`Nalezeno ${result.totalCount} leadů (zobrazuji ${fromRecord}-${toRecord}):\n`);

  if (result.data.length === 0) {
    console.log("Žádné leady nenalezeny.");
    return;
  }

  for (const lead of result.data) {
    console.log(`[${lead.id}] ${lead.topic}`);
    if (lead.companyName) console.log(`    Firma: ${lead.companyName}`);
    if (lead.contactInfo?.email) console.log(`    Email: ${lead.contactInfo.email}`);
    if (lead.contactInfo?.tel1) console.log(`    Tel: ${lead.contactInfo.tel1}`);
    if (lead.leadPhase?.value) console.log(`    Fáze: ${lead.leadPhase.value}`);
    if (lead.priority) console.log(`    Priorita: ${lead.priority}`);
    if (lead.owner) console.log(`    Owner: ${lead.owner.fullName}`);
    if (lead.rowInfo?.createdAt) console.log(`    Vytvořeno: ${lead.rowInfo.createdAt}`);
    if (lead.rowInfo?.updatedAt) console.log(`    Upraveno: ${lead.rowInfo.updatedAt}`);
    if (lead.notice) console.log(`    Poznámka: ${lead.notice.substring(0, 100)}...`);
    console.log("");
  }
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
