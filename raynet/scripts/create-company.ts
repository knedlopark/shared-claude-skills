/**
 * Vytvoření firmy v Raynet CRM
 *
 * Usage:
 *   npx tsx ./skills/raynet/scripts/create-company.ts --name="Firma s.r.o."
 *   npx tsx ./skills/raynet/scripts/create-company.ts --name="Firma" --ico=12345678 --email=info@firma.cz
 */

import { RaynetClient, CreateCompanyRequest } from "./lib/raynet-client.js";

interface ParsedArgs extends CreateCompanyRequest {
  help?: boolean;
  ownerName?: string;
  // Temporary address fields for parsing
  _street?: string;
  _city?: string;
  _zipCode?: string;
  _country?: string;
}

function parseArgs(): ParsedArgs {
  const args = process.argv.slice(2);
  const result: ParsedArgs = {
    name: "",
  };

  for (const arg of args) {
    if (arg === "--help" || arg === "-h") {
      result.help = true;
    } else if (arg.startsWith("--name=")) {
      result.name = arg.split("=").slice(1).join("=");
    } else if (arg.startsWith("--ico=") || arg.startsWith("--reg-number=")) {
      result.regNumber = arg.split("=")[1];
    } else if (arg.startsWith("--dic=") || arg.startsWith("--tax-number=")) {
      result.taxNumber = arg.split("=")[1];
    } else if (arg.startsWith("--owner=")) {
      result.owner = parseInt(arg.split("=")[1], 10);
    } else if (arg.startsWith("--owner-name=")) {
      result.ownerName = arg.split("=").slice(1).join("=");
    } else if (arg.startsWith("--rating=")) {
      result.rating = arg.split("=")[1];
    } else if (arg.startsWith("--state=")) {
      result.state = arg.split("=")[1];
    } else if (arg.startsWith("--role=")) {
      result.role = arg.split("=")[1];
    } else if (arg.startsWith("--category=")) {
      result.category = parseInt(arg.split("=")[1], 10);
    } else if (arg.startsWith("--contact-source=")) {
      result.contactSource = parseInt(arg.split("=")[1], 10);
    } else if (arg.startsWith("--email=")) {
      result.contactInfo = result.contactInfo || {};
      result.contactInfo.email = arg.split("=").slice(1).join("=");
    } else if (arg.startsWith("--tel=") || arg.startsWith("--phone=")) {
      result.contactInfo = result.contactInfo || {};
      result.contactInfo.tel1 = arg.split("=")[1];
    } else if (arg.startsWith("--www=") || arg.startsWith("--web=")) {
      result.contactInfo = result.contactInfo || {};
      result.contactInfo.www = arg.split("=").slice(1).join("=");
    } else if (arg.startsWith("--street=")) {
      result._street = arg.split("=").slice(1).join("=");
    } else if (arg.startsWith("--city=")) {
      result._city = arg.split("=").slice(1).join("=");
    } else if (arg.startsWith("--zip=")) {
      result._zipCode = arg.split("=")[1];
    } else if (arg.startsWith("--country=")) {
      result._country = arg.split("=").slice(1).join("=");
    } else if (arg.startsWith("--notice=")) {
      result.notice = arg.split("=").slice(1).join("=");
    }
  }

  // Build addresses array if any address field is provided
  if (result._street || result._city || result._zipCode || result._country) {
    result.addresses = [
      {
        address: {
          street: result._street,
          city: result._city,
          zipCode: result._zipCode,
          country: result._country,
        },
        primary: true,
      },
    ];
  }

  return result;
}

function showHelp(): void {
  console.log(`
Vytvoření firmy v Raynet CRM

Usage:
  npx tsx create-company.ts --name="..." [options]

Povinné parametry:
  --name=TEXT           Název firmy

Volitelné parametry:
  --ico=TEXT            IČO
  --dic=TEXT            DIČ
  --owner=ID            ID vlastníka
  --owner-name=NAME     Jméno vlastníka (automaticky najde ID)
  --rating=VALUE        Rating (A, B, C, ...) [default: B]
  --state=VALUE         Stav (A_POTENTIAL, B_ACTUAL, ...) [default: A_POTENTIAL]
  --role=VALUE          Role (A_SUBSCRIBER, B_PARTNER, ...)
  --category=ID         ID kategorie (viz get-enums.ts)
  --contact-source=ID   ID zdroje kontaktu (viz get-enums.ts)
  --email=TEXT          Email
  --tel=TEXT            Telefon
  --www=TEXT            Webová stránka
  --street=TEXT         Ulice
  --city=TEXT           Město
  --zip=TEXT            PSČ
  --country=TEXT        Země
  --notice=TEXT         Poznámka

Příklady:
  npx tsx create-company.ts --name="Firma s.r.o."
  npx tsx create-company.ts --name="Firma s.r.o." --ico=12345678 --email=info@firma.cz
  npx tsx create-company.ts --name="Nový klient" --owner-name="Roman Kytka" --role=A_POTENTIAL
  npx tsx create-company.ts --name="Firma" --category=222 --contact-source=162 --street="Ulice 123" --city="Praha"
`);
}

async function main() {
  const data = parseArgs();

  if (data.help) {
    showHelp();
    return;
  }

  if (!data.name) {
    console.error("Chyba: --name je povinný parametr");
    console.error("Použij --help pro zobrazení nápovědy");
    process.exit(1);
  }

  const client = RaynetClient.createFromCredentialsFile();

  // Resolve owner name to ID
  if (data.ownerName && !data.owner) {
    const ownerId = await client.findOwnerId(data.ownerName);
    if (ownerId) {
      data.owner = ownerId;
    } else {
      console.error(`Varování: Vlastník "${data.ownerName}" nenalezen`);
    }
  }

  // Remove helper fields
  const { help, ownerName, _street, _city, _zipCode, _country, ...companyData } = data;

  // Set defaults for required API fields
  if (!companyData.state) companyData.state = "A_POTENTIAL";
  if (!companyData.rating) companyData.rating = "B";

  const result = await client.createCompany(companyData);

  console.log(`✓ Firma vytvořena s ID: ${result.id}`);
  console.log(`  URL: https://app.raynet.cz/${client.instanceName}/?view=DetailView&en=Company&ei=${result.id}`);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
