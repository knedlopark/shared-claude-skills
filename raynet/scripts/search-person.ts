/**
 * Vyhledání kontaktů v Raynet CRM s podporou řazení a filtrování
 *
 * Usage:
 *   npx tsx ./skills/raynet/scripts/search-person.ts "jméno"
 *   npx tsx ./skills/raynet/scripts/search-person.ts --all --sort=lastName --limit=50
 *   npx tsx ./skills/raynet/scripts/search-person.ts "novák" --sort=lastName --order=ASC
 *   npx tsx ./skills/raynet/scripts/search-person.ts --owner-name="Roman Kytka"
 *   npx tsx ./skills/raynet/scripts/search-person.ts --created-after=2024-01-01 --json
 */

import {
  RaynetClient,
  PersonSearchOptions,
  PersonSortColumn,
  SortDirection,
} from "./lib/raynet-client.js";

interface ParsedArgs {
  fulltext?: string;
  limit: number;
  offset: number;
  sortColumn?: PersonSortColumn;
  sortDirection: SortDirection;
  json: boolean;
  all: boolean;
  // Filtry
  firstName?: string;
  lastName?: string;
  owner?: number;
  ownerName?: string;
  category?: number;
  tags?: string;
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
      result.sortColumn = arg.split("=")[1] as PersonSortColumn;
    } else if (arg.startsWith("--order=")) {
      result.sortDirection = arg.split("=")[1].toUpperCase() as SortDirection;
    } else if (arg.startsWith("--first-name=")) {
      result.firstName = arg.split("=")[1];
    } else if (arg.startsWith("--last-name=")) {
      result.lastName = arg.split("=")[1];
    } else if (arg.startsWith("--owner=")) {
      result.owner = parseInt(arg.split("=")[1], 10);
    } else if (arg.startsWith("--owner-name=")) {
      result.ownerName = arg.split("=")[1];
    } else if (arg.startsWith("--category=")) {
      result.category = parseInt(arg.split("=")[1], 10);
    } else if (arg.startsWith("--tags=")) {
      result.tags = arg.split("=")[1];
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
Vyhledání kontaktů v Raynet CRM

Usage:
  npx tsx search-person.ts [query] [options]

Základní:
  query                   Fulltextové vyhledávání
  --all                   Vypsat všechny kontakty (bez filtrů)
  --limit=N               Max počet výsledků (default: 20, max: 1000)
  --offset=N              Přeskočit prvních N výsledků
  --json                  Výstup v JSON formátu

Řazení:
  --sort=COLUMN           Sloupec pro řazení:
                          id, firstName, lastName,
                          rowInfo.createdAt, rowInfo.updatedAt
  --order=ASC|DESC        Směr řazení (default: ASC)

Filtry:
  --first-name=TEXT       Filtr podle jména (podporuje % pro wildcard)
  --last-name=TEXT        Filtr podle příjmení (podporuje % pro wildcard)
  --owner=ID              Filtr podle vlastníka (ID)
  --owner-name=NAME       Filtr podle vlastníka (jméno - automaticky najde ID)
  --category=ID           Filtr podle kategorie
  --tags=TAG1,TAG2        Filtr podle tagů (OR logika)

Datumové filtry (formát: YYYY-MM-DD):
  --created-after=DATE    Vytvořeno po datu
  --created-before=DATE   Vytvořeno před datem
  --updated-after=DATE    Upraveno po datu
  --updated-before=DATE   Upraveno před datem

Příklady:
  # Všechny kontakty seřazené podle příjmení
  npx tsx search-person.ts --all --sort=lastName --limit=100

  # Fulltext vyhledávání seřazené podle příjmení
  npx tsx search-person.ts "novak" --sort=lastName

  # Nejnovější kontakty
  npx tsx search-person.ts --all --sort=rowInfo.createdAt --order=DESC --limit=10

  # Kontakty konkrétního obchodníka
  npx tsx search-person.ts --owner-name="Roman Kytka" --sort=lastName

  # Kontakty s příjmením začínajícím na "Nov"
  npx tsx search-person.ts --last-name="Nov%" --sort=lastName

  # Kontakty vytvořené v roce 2024
  npx tsx search-person.ts --created-after=2024-01-01 --created-before=2025-01-01
`);
}

function formatName(person: {
  titleBefore?: string;
  firstName?: string;
  lastName: string;
  titleAfter?: string;
}): string {
  const parts = [person.titleBefore, person.firstName, person.lastName, person.titleAfter].filter(
    Boolean
  );
  return parts.join(" ");
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
    args.firstName ||
    args.lastName ||
    args.owner ||
    args.ownerName ||
    args.category ||
    args.tags ||
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

  const options: PersonSearchOptions = {
    fulltext: args.fulltext,
    limit: args.limit,
    offset: args.offset,
    sortColumn: args.sortColumn,
    sortDirection: args.sortDirection,
    firstName: args.firstName,
    lastName: args.lastName,
    owner: ownerId,
    category: args.category,
    tags: args.tags,
    createdAfter: args.createdAfter,
    createdBefore: args.createdBefore,
    updatedAfter: args.updatedAfter,
    updatedBefore: args.updatedBefore,
  };

  const result = await client.searchPersons(options);

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  const fromRecord = args.offset + 1;
  const toRecord = args.offset + result.data.length;
  console.log(`Nalezeno ${result.totalCount} kontaktů (zobrazuji ${fromRecord}-${toRecord}):\n`);

  if (result.data.length === 0) {
    console.log("Žádné kontakty nenalezeny.");
    return;
  }

  for (const person of result.data) {
    console.log(`[${person.id}] ${formatName(person)}`);
    if (person.primaryRelationship?.company) {
      const pos = person.primaryRelationship.position
        ? ` (${person.primaryRelationship.position})`
        : "";
      console.log(`    Firma: ${person.primaryRelationship.company.name}${pos}`);
    }
    if (person.contactInfo?.email) console.log(`    Email: ${person.contactInfo.email}`);
    if (person.contactInfo?.tel1) console.log(`    Tel: ${person.contactInfo.tel1}`);
    if (person.owner) console.log(`    Owner: ${person.owner.fullName}`);
    if (person.rowInfo?.createdAt) console.log(`    Vytvořeno: ${person.rowInfo.createdAt}`);
    if (person.rowInfo?.updatedAt) console.log(`    Upraveno: ${person.rowInfo.updatedAt}`);
    console.log("");
  }
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
