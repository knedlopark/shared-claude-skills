/**
 * Výpis produktů z Raynet CRM
 *
 * Usage:
 *   npx tsx ./skills/raynet/scripts/list-products.ts
 *   npx tsx ./skills/raynet/scripts/list-products.ts --fulltext="Rekap"
 *   npx tsx ./skills/raynet/scripts/list-products.ts --code=R03
 *   npx tsx ./skills/raynet/scripts/list-products.ts --product-line="Rekap"
 *   npx tsx ./skills/raynet/scripts/list-products.ts --json
 */

import { RaynetClient } from "./lib/raynet-client.js";

const USAGE = `
Výpis produktů z Raynet CRM

Usage:
  npx tsx list-products.ts [options]

Options:
  --fulltext=TEXT      Fulltextové vyhledávání
  --code=CODE          Filtr podle kódu produktu (LIKE)
  --product-line=NAME  Filtr podle produktové řady (lokální filtr)
  --limit=N            Max počet výsledků (default: 100)
  --json               Výstup v JSON formátu

Příklady:
  npx tsx list-products.ts
  npx tsx list-products.ts --fulltext="Rekap"
  npx tsx list-products.ts --code=R03
  npx tsx list-products.ts --product-line="Rekap" --json
`;

interface Product {
  id: number;
  code: string;
  name: string;
  unit?: string;
  primaryPriceListItem?: {
    price?: number;
    priceList?: { currency?: string };
  };
  productLine?: { id: number; value: string };
}

function parseArgs() {
  const args = process.argv.slice(2);
  const options: Record<string, string> = {};

  for (const arg of args) {
    if (arg === "--help" || arg === "-h") {
      console.log(USAGE);
      process.exit(0);
    }
    if (arg.startsWith("--")) {
      const eqIdx = arg.indexOf("=");
      if (eqIdx > 0) {
        options[arg.slice(2, eqIdx)] = arg.slice(eqIdx + 1);
      } else {
        options[arg.slice(2)] = "true";
      }
    }
  }

  return options;
}

async function main() {
  const options = parseArgs();
  const json = options.json === "true";
  const limit = parseInt(options.limit || "100", 10);
  const productLineFilter = options["product-line"]?.toLowerCase();

  const client = RaynetClient.createFromCredentialsFile();

  const params = new URLSearchParams();
  params.set("limit", limit.toString());
  params.set("sortColumn", "code");
  params.set("sortDirection", "ASC");

  if (options.fulltext) {
    params.set("fulltext", options.fulltext);
  }
  if (options.code) {
    params.set("code[LIKE_NOCASE]", options.code);
  }

  const result = await client.apiRequest<{ totalCount: number; data: Product[] }>(
    "GET",
    `/product/?${params.toString()}`
  );

  let products = result.data;

  // Lokální filtr na productLine (API nepodporuje tento filtr)
  if (productLineFilter) {
    products = products.filter(
      (p) => p.productLine?.value?.toLowerCase().includes(productLineFilter)
    );
  }

  if (json) {
    console.log(JSON.stringify(products, null, 2));
    return;
  }

  console.log(`Celkem produktů: ${result.totalCount}${productLineFilter ? ` (zobrazeno po filtraci: ${products.length})` : ""}\n`);

  if (products.length === 0) {
    console.log("Žádné produkty nenalezeny.");
    return;
  }

  for (const p of products) {
    const price = p.primaryPriceListItem?.price ?? "N/A";
    const currency = p.primaryPriceListItem?.priceList?.currency ?? "";
    const unit = p.unit || "";
    const line = p.productLine?.value ?? "";
    console.log(`[${p.id}] ${p.code} - ${p.name} | ${price} ${currency}${unit ? "/" + unit : ""} | ${line}`);
  }
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
