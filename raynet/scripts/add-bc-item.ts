/**
 * Přidání produktové položky do obchodního případu v Raynet CRM
 *
 * Usage:
 *   npx tsx ./skills/raynet/scripts/add-bc-item.ts --bc=3091 --product=123 --count=2.5
 *   npx tsx ./skills/raynet/scripts/add-bc-item.ts --bc=3091 --product=123 --count=1 --price=1600 --unit=hod
 */

import { RaynetClient } from "./lib/raynet-client.js";

const USAGE = `
Přidání produktové položky do obchodního případu

Usage:
  npx tsx add-bc-item.ts --bc=ID --product=PRODUCT_ID --count=N [options]

Povinné parametry:
  --bc=ID              ID obchodního případu
  --product=ID         ID produktu (z list-products.ts)
  --count=N            Množství (může být desetinné, např. 2.5)

Volitelné parametry:
  --price=N            Vlastní cena (přepíše ceníkovou)
  --unit=TEXT          Jednotka (např. hod, ks, měs)
  --discount=N         Sleva v % (0-100)
  --description=TEXT   Popis položky

Příklady:
  # Přidání produktu s výchozí cenou z ceníku
  npx tsx add-bc-item.ts --bc=3091 --product=123 --count=1

  # Přidání s vlastní cenou a jednotkou
  npx tsx add-bc-item.ts --bc=3091 --product=123 --count=2.5 --price=1600 --unit=hod

  # Přidání se slevou
  npx tsx add-bc-item.ts --bc=3091 --product=123 --count=1 --discount=10
`;

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

  if (!options.bc || !options.product || !options.count) {
    console.error("Chyba: Parametry --bc, --product a --count jsou povinné.\n");
    console.log(USAGE);
    process.exit(1);
  }

  const bcId = parseInt(options.bc, 10);
  const productId = parseInt(options.product, 10);
  const count = parseFloat(options.count);

  if (isNaN(bcId) || isNaN(productId) || isNaN(count)) {
    console.error("Chyba: --bc, --product a --count musí být čísla.");
    process.exit(1);
  }

  const client = RaynetClient.createFromCredentialsFile();

  // Sestavení těla požadavku
  const body: Record<string, unknown> = {
    product: productId,
    count,
  };

  if (options.price) {
    body.price = parseFloat(options.price);
  }
  if (options.unit) {
    body.unit = options.unit;
  }
  if (options.discount) {
    body.discountPercent = parseFloat(options.discount);
  }
  if (options.description) {
    body.description = options.description;
  }

  const result = await client.apiRequest<{ data?: { id: number } }>(
    "PUT",
    `/businessCase/${bcId}/item/`,
    body
  );

  const itemId = result.data?.id || "N/A";
  console.log(`Položka přidána do OP ${bcId} (item ID: ${itemId})`);
  console.log(`  Produkt: ${productId}`);
  console.log(`  Množství: ${count}`);
  if (options.price) console.log(`  Cena: ${options.price}`);
  if (options.unit) console.log(`  Jednotka: ${options.unit}`);
  if (options.discount) console.log(`  Sleva: ${options.discount}%`);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
