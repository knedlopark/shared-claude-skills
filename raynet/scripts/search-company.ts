/**
 * Vyhledání firem v Raynet CRM s podporou řazení a filtrování
 *
 * Usage:
 *   npx tsx ./skills/raynet/scripts/search-company.ts "název firmy"
 *   npx tsx ./skills/raynet/scripts/search-company.ts --all --sort=name --limit=50
 *   npx tsx ./skills/raynet/scripts/search-company.ts "firma" --sort=name --order=DESC
 *   npx tsx ./skills/raynet/scripts/search-company.ts --name="RAY%" --sort=rowInfo.updatedAt
 *   npx tsx ./skills/raynet/scripts/search-company.ts --created-after=2024-01-01 --order=DESC
 *   npx tsx ./skills/raynet/scripts/search-company.ts --owner-name="Roman Kytka"
 *   npx tsx ./skills/raynet/scripts/search-company.ts "firma" --json
 */

import {
  RaynetClient,
  CompanySearchOptions,
  CompanySortColumn,
  SortDirection,
} from "./lib/raynet-client.js";

interface ParsedArgs {
  fulltext?: string;
  limit: number;
  offset: number;
  sortColumn?: CompanySortColumn;
  sortDirection: SortDirection;
  json: boolean;
  all: boolean;
  // Filtry
  name?: string;
  ico?: string;
  owner?: number;
  ownerName?: string;
  rating?: string;
  state?: string;
  role?: string;
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
      result.sortColumn = arg.split("=")[1] as CompanySortColumn;
    } else if (arg.startsWith("--order=")) {
      result.sortDirection = arg.split("=")[1].toUpperCase() as SortDirection;
    } else if (arg.startsWith("--name=")) {
      result.name = arg.split("=")[1];
    } else if (arg.startsWith("--ico=")) {
      result.ico = arg.split("=")[1];
    } else if (arg.startsWith("--owner=")) {
      result.owner = parseInt(arg.split("=")[1], 10);
    } else if (arg.startsWith("--owner-name=")) {
      result.ownerName = arg.split("=")[1];
    } else if (arg.startsWith("--rating=")) {
      result.rating = arg.split("=")[1];
    } else if (arg.startsWith("--state=")) {
      result.state = arg.split("=")[1];
    } else if (arg.startsWith("--role=")) {
      result.role = arg.split("=")[1];
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
Vyhledání firem v Raynet CRM

Usage:
  npx tsx search-company.ts [query] [options]

Základní:
  query                   Fulltextové vyhledávání
  --all                   Vypsat všechny firmy (bez filtrů)
  --limit=N               Max počet výsledků (default: 20, max: 1000)
  --offset=N              Přeskočit prvních N výsledků
  --json                  Výstup v JSON formátu

Řazení:
  --sort=COLUMN           Sloupec pro řazení:
                          id, name, lastName, regNumber, rating, state, role,
                          rowInfo.createdAt, rowInfo.updatedAt
  --order=ASC|DESC        Směr řazení (default: ASC)

Filtry:
  --name=TEXT             Filtr podle názvu (podporuje % pro wildcard)
  --ico=ICO               Filtr podle IČO
  --owner=ID              Filtr podle vlastníka (ID)
  --owner-name=NAME       Filtr podle vlastníka (jméno - automaticky najde ID)
  --rating=VALUE          Filtr podle ratingu
  --state=VALUE           Filtr podle stavu
  --role=VALUE            Filtr podle role
  --category=ID           Filtr podle kategorie
  --tags=TAG1,TAG2        Filtr podle tagů (OR logika)

Datumové filtry (formát: YYYY-MM-DD):
  --created-after=DATE    Vytvořeno po datu
  --created-before=DATE   Vytvořeno před datem
  --updated-after=DATE    Upraveno po datu
  --updated-before=DATE   Upraveno před datem

Příklady:
  # Všechny firmy seřazené podle jména
  npx tsx search-company.ts --all --sort=name --limit=100

  # Fulltext vyhledávání seřazené podle jména
  npx tsx search-company.ts "nova" --sort=name

  # Nejnovější firmy
  npx tsx search-company.ts --all --sort=rowInfo.createdAt --order=DESC --limit=10

  # Firmy konkrétního obchodníka
  npx tsx search-company.ts --owner-name="Roman Kytka" --sort=name

  # Firmy vytvořené v roce 2024
  npx tsx search-company.ts --created-after=2024-01-01 --created-before=2025-01-01

  # Firmy s tagem VIP
  npx tsx search-company.ts --tags=VIP --sort=name
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
    args.name ||
    args.ico ||
    args.owner ||
    args.ownerName ||
    args.rating ||
    args.state ||
    args.role ||
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

  const options: CompanySearchOptions = {
    fulltext: args.fulltext,
    limit: args.limit,
    offset: args.offset,
    sortColumn: args.sortColumn,
    sortDirection: args.sortDirection,
    name: args.name,
    regNumber: args.ico,
    owner: ownerId,
    rating: args.rating,
    state: args.state,
    role: args.role,
    category: args.category,
    tags: args.tags,
    createdAfter: args.createdAfter,
    createdBefore: args.createdBefore,
    updatedAfter: args.updatedAfter,
    updatedBefore: args.updatedBefore,
  };

  const result = await client.searchCompanies(options);

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  const fromRecord = args.offset + 1;
  const toRecord = args.offset + result.data.length;
  console.log(`Nalezeno ${result.totalCount} firem (zobrazuji ${fromRecord}-${toRecord}):\n`);

  if (result.data.length === 0) {
    console.log("Žádné firmy nenalezeny.");
    return;
  }

  for (const company of result.data) {
    console.log(`[${company.id}] ${company.name}`);
    if (company.regNumber) console.log(`    IČO: ${company.regNumber}`);
    if (company.contactInfo?.email) console.log(`    Email: ${company.contactInfo.email}`);
    if (company.contactInfo?.tel1) console.log(`    Tel: ${company.contactInfo.tel1}`);
    if (company.address) {
      const addr = [company.address.street, company.address.city, company.address.zipCode]
        .filter(Boolean)
        .join(", ");
      if (addr) console.log(`    Adresa: ${addr}`);
    }
    if (company.owner) console.log(`    Owner: ${company.owner.fullName}`);
    if (company.rating) console.log(`    Rating: ${company.rating}`);
    if (company.rowInfo?.createdAt) console.log(`    Vytvořeno: ${company.rowInfo.createdAt}`);
    if (company.rowInfo?.updatedAt) console.log(`    Upraveno: ${company.rowInfo.updatedAt}`);
    console.log("");
  }
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
