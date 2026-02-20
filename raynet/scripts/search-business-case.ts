/**
 * Vyhledání obchodních případů v Raynet CRM s podporou řazení a filtrování
 *
 * Usage:
 *   npx tsx ./skills/raynet/scripts/search-business-case.ts "projekt"
 *   npx tsx ./skills/raynet/scripts/search-business-case.ts --all --sort=totalAmount --order=DESC
 *   npx tsx ./skills/raynet/scripts/search-business-case.ts --phase=9 --category=118 --all
 *   npx tsx ./skills/raynet/scripts/search-business-case.ts --scheduled-end-after=2026-01-01 --scheduled-end-before=2026-01-31 --all
 *   npx tsx ./skills/raynet/scripts/search-business-case.ts --owner-name="Roman Kytka" --all
 */

import {
  RaynetClient,
  BusinessCase,
  BusinessCaseSearchOptions,
  BusinessCaseSortColumn,
  SortDirection,
} from "./lib/raynet-client.js";

interface ParsedArgs {
  fulltext?: string;
  limit: number;
  offset: number;
  sortColumn?: BusinessCaseSortColumn;
  sortDirection: SortDirection;
  json: boolean;
  all: boolean;
  // Filtry
  owner?: number;
  ownerName?: string;
  businessCasePhase?: number;
  company?: number;
  category?: number;
  tags?: string;
  scheduledEndAfter?: string;
  scheduledEndBefore?: string;
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
      result.sortColumn = arg.split("=")[1] as BusinessCaseSortColumn;
    } else if (arg.startsWith("--order=")) {
      result.sortDirection = arg.split("=")[1].toUpperCase() as SortDirection;
    } else if (arg.startsWith("--owner=")) {
      result.owner = parseInt(arg.split("=")[1], 10);
    } else if (arg.startsWith("--owner-name=")) {
      result.ownerName = arg.split("=")[1];
    } else if (arg.startsWith("--phase=")) {
      result.businessCasePhase = parseInt(arg.split("=")[1], 10);
    } else if (arg.startsWith("--company=")) {
      result.company = parseInt(arg.split("=")[1], 10);
    } else if (arg.startsWith("--category=")) {
      result.category = parseInt(arg.split("=")[1], 10);
    } else if (arg.startsWith("--tags=")) {
      result.tags = arg.split("=")[1];
    } else if (arg.startsWith("--scheduled-end-after=")) {
      result.scheduledEndAfter = arg.split("=")[1];
    } else if (arg.startsWith("--scheduled-end-before=")) {
      result.scheduledEndBefore = arg.split("=")[1];
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
Vyhledání obchodních případů v Raynet CRM

Usage:
  npx tsx search-business-case.ts [query] [options]

Základní:
  query                   Fulltextové vyhledávání
  --all                   Vypsat všechny OP (bez fulltext dotazu)
  --limit=N               Max počet výsledků (default: 20, max: 1000)
  --offset=N              Přeskočit prvních N výsledků
  --json                  Výstup v JSON formátu

Řazení:
  --sort=COLUMN           Sloupec pro řazení:
                          id, name, totalAmount, scheduledEnd,
                          rowInfo.createdAt, rowInfo.updatedAt
  --order=ASC|DESC        Směr řazení (default: ASC)

Filtry:
  --owner=ID              Filtr podle vlastníka (ID)
  --owner-name=NAME       Filtr podle vlastníka (jméno - automaticky najde ID)
  --phase=ID              Filtr podle fáze OP (ID):
                          Trial=9, Split=12, Billing=10, V procesu=13, Review=16, Výhra=4
  --company=ID            Filtr podle firmy (ID)
  --category=ID           Filtr podle kategorie:
                          CUST=118, CON=281, PI=116, RP=117, Změna PI=287
  --tags=TAG1,TAG2        Filtr podle tagů (OR logika)

Datumové filtry (formát: YYYY-MM-DD):
  --scheduled-end-after=DATE    Odhad uzavření od data
  --scheduled-end-before=DATE   Odhad uzavření do data
  --created-after=DATE          Vytvořeno po datu
  --created-before=DATE         Vytvořeno před datem
  --updated-after=DATE          Upraveno po datu
  --updated-before=DATE         Upraveno před datem

Příklady:
  # Fulltext vyhledávání
  npx tsx search-business-case.ts "projekt"

  # OP s odhadem uzavření v lednu 2026
  npx tsx search-business-case.ts --scheduled-end-after=2026-01-01 --scheduled-end-before=2026-01-31 --all

  # OP ve fázi Trial seřazené podle hodnoty
  npx tsx search-business-case.ts --phase=9 --sort=totalAmount --order=DESC --all

  # OP kategorie CUST
  npx tsx search-business-case.ts --category=118 --all

  # OP konkrétního obchodníka
  npx tsx search-business-case.ts --owner-name="Roman Kytka" --all

  # Kombinace filtrů: CUST/CON v únoru, seřazené podle hodnoty
  npx tsx search-business-case.ts --scheduled-end-after=2026-02-01 --scheduled-end-before=2026-02-28 --sort=totalAmount --order=DESC --all
`);
}

function formatAmount(amount?: number, currency?: { value: string }): string {
  if (!amount) return "";
  const curr = currency?.value || "CZK";
  return `${amount.toLocaleString("cs-CZ")} ${curr}`;
}

function formatBusinessCase(bc: BusinessCase, instanceName: string): void {
  const phase = bc.businessCasePhase ? `[${bc.businessCasePhase.value}]` : "";
  const amount = formatAmount(bc.totalAmount, bc.currency);
  const url = `https://app.raynet.cz/${instanceName}/?view=DetailView&en=BusinessCase&ei=${bc.id}`;

  console.log(`[${bc.id}] ${bc.name} ${phase}`.trim());
  if (bc.code) console.log(`    Kód: ${bc.code}`);
  if (amount) console.log(`    Hodnota: ${amount}`);
  if (bc.company) console.log(`    Firma: ${bc.company.name}`);
  if (bc.person) console.log(`    Kontakt: ${bc.person.fullName}`);
  if (bc.owner) console.log(`    Owner: ${bc.owner.fullName}`);
  if (bc.scheduledEnd) console.log(`    Odhad uzavření: ${bc.scheduledEnd}`);
  if (bc.validFrom) console.log(`    Platnost od: ${bc.validFrom}`);
  if (bc.validTill) console.log(`    Platnost do: ${bc.validTill}`);
  console.log(`    URL: ${url}`);
  console.log("");
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
    args.businessCasePhase ||
    args.company ||
    args.category ||
    args.tags ||
    args.scheduledEndAfter ||
    args.scheduledEndBefore ||
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
  let ownerId: number | undefined = args.owner;
  if (args.ownerName && !ownerId) {
    const foundId = await client.findOwnerId(args.ownerName);
    if (!foundId) {
      console.error(`Chyba: Vlastník "${args.ownerName}" nenalezen v Raynetu.`);
      process.exit(1);
    }
    ownerId = foundId;
  }

  const options: BusinessCaseSearchOptions = {
    fulltext: args.fulltext,
    limit: args.limit,
    offset: args.offset,
    sortColumn: args.sortColumn,
    sortDirection: args.sortDirection,
    owner: ownerId,
    businessCasePhase: args.businessCasePhase,
    company: args.company,
    category: args.category,
    tags: args.tags,
    scheduledEndAfter: args.scheduledEndAfter,
    scheduledEndBefore: args.scheduledEndBefore,
    createdAfter: args.createdAfter,
    createdBefore: args.createdBefore,
    updatedAfter: args.updatedAfter,
    updatedBefore: args.updatedBefore,
  };

  const result = await client.searchBusinessCases(options);

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  const fromRecord = args.offset + 1;
  const toRecord = args.offset + result.data.length;
  console.log(`Nalezeno ${result.totalCount} obchodních případů (zobrazuji ${fromRecord}-${toRecord}):\n`);

  if (result.data.length === 0) {
    console.log("Žádné obchodní případy nenalezeny.");
    return;
  }

  for (const bc of result.data) {
    formatBusinessCase(bc, client.instanceName);
  }
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
