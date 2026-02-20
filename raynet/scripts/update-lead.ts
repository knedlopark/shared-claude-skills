/**
 * Aktualizace leadu v Raynet CRM
 *
 * Usage:
 *   npx tsx ./skills/raynet/scripts/update-lead.ts 123 --topic="Nový název"
 *   npx tsx ./skills/raynet/scripts/update-lead.ts 123 --phase=5 --priority=HIGH
 */

import { RaynetClient, UpdateLeadRequest } from "./lib/raynet-client.js";

interface ParsedArgs {
  id?: number;
  data: UpdateLeadRequest;
  help?: boolean;
  ownerName?: string;
  tags?: string[];
  addTags?: string[];
  removeTags?: string[];
}

function parseArgs(): ParsedArgs {
  const args = process.argv.slice(2);
  const result: ParsedArgs = {
    data: {},
  };

  for (const arg of args) {
    if (arg === "--help" || arg === "-h") {
      result.help = true;
    } else if (!arg.startsWith("--") && !result.id) {
      result.id = parseInt(arg, 10);
    } else if (arg.startsWith("--topic=")) {
      result.data.topic = arg.split("=").slice(1).join("=");
    } else if (arg.startsWith("--owner=")) {
      result.data.owner = parseInt(arg.split("=")[1], 10);
    } else if (arg.startsWith("--owner-name=")) {
      result.ownerName = arg.split("=").slice(1).join("=");
    } else if (arg.startsWith("--phase=")) {
      result.data.leadPhase = parseInt(arg.split("=")[1], 10);
    } else if (arg.startsWith("--priority=")) {
      result.data.priority = arg.split("=")[1];
    } else if (arg.startsWith("--company-name=")) {
      result.data.companyName = arg.split("=").slice(1).join("=");
    } else if (arg.startsWith("--title-before=")) {
      result.data.titleBefore = arg.split("=").slice(1).join("=");
    } else if (arg.startsWith("--first-name=")) {
      result.data.firstName = arg.split("=").slice(1).join("=");
    } else if (arg.startsWith("--last-name=")) {
      result.data.lastName = arg.split("=").slice(1).join("=");
    } else if (arg.startsWith("--title-after=")) {
      result.data.titleAfter = arg.split("=").slice(1).join("=");
    } else if (arg.startsWith("--email=")) {
      result.data.contactInfo = result.data.contactInfo || {};
      result.data.contactInfo.email = arg.split("=").slice(1).join("=");
    } else if (arg.startsWith("--tel=") || arg.startsWith("--phone=")) {
      result.data.contactInfo = result.data.contactInfo || {};
      result.data.contactInfo.tel1 = arg.split("=")[1];
    } else if (arg.startsWith("--notice=")) {
      result.data.notice = arg.split("=").slice(1).join("=");
    } else if (arg.startsWith("--tags=")) {
      result.tags = arg.split("=").slice(1).join("=").split(",").map((t) => t.trim());
    } else if (arg.startsWith("--add-tags=")) {
      result.addTags = arg.split("=").slice(1).join("=").split(",").map((t) => t.trim());
    } else if (arg.startsWith("--remove-tags=")) {
      result.removeTags = arg.split("=").slice(1).join("=").split(",").map((t) => t.trim());
    }
  }

  return result;
}

function showHelp(): void {
  console.log(`
Aktualizace leadu v Raynet CRM

Usage:
  npx tsx update-lead.ts <ID> [options]

Povinné parametry:
  ID                    ID leadu k aktualizaci

Volitelné parametry:
  --topic=TEXT          Téma/název leadu
  --owner=ID            ID vlastníka
  --owner-name=NAME     Jméno vlastníka (automaticky najde ID)
  --phase=ID            ID fáze leadu
  --priority=VALUE      Priorita (NORMAL, HIGH, ...)
  --company-name=TEXT   Název firmy
  --title-before=TEXT   Titul před jménem (Ing., Mgr., ...)
  --first-name=TEXT     Jméno kontaktu
  --last-name=TEXT      Příjmení kontaktu
  --title-after=TEXT    Titul za jménem (PhD., CSc., ...)
  --email=TEXT          Email
  --tel=TEXT            Telefon
  --notice=TEXT         Poznámka

Tagy:
  --tags=TAG1,TAG2      Nastaví tagy (nahradí stávající)
  --add-tags=TAG1,TAG2  Přidá tagy (zachová stávající)
  --remove-tags=TAG1    Odebere tagy

Příklady:
  npx tsx update-lead.ts 123 --topic="Nový název"
  npx tsx update-lead.ts 123 --phase=5 --priority=HIGH
  npx tsx update-lead.ts 123 --tags="Firma,Studený,1.email,Poslat"
  npx tsx update-lead.ts 123 --add-tags="Odesláno" --remove-tags="Poslat"
`);
}

async function main() {
  const { id, data, help, ownerName, tags, addTags, removeTags } = parseArgs();

  if (help) {
    showHelp();
    return;
  }

  if (!id) {
    console.error("Chyba: ID leadu je povinný parametr");
    console.error("Použij --help pro zobrazení nápovědy");
    process.exit(1);
  }

  const hasTags = tags || addTags || removeTags;
  if (Object.keys(data).length === 0 && !ownerName && !hasTags) {
    console.error("Chyba: Musíš zadat alespoň jeden parametr k aktualizaci");
    console.error("Použij --help pro zobrazení nápovědy");
    process.exit(1);
  }

  const client = RaynetClient.createFromCredentialsFile();

  // Resolve owner name to ID
  if (ownerName && !data.owner) {
    const ownerId = await client.findOwnerId(ownerName);
    if (ownerId) {
      data.owner = ownerId;
    } else {
      console.error(`Varování: Vlastník "${ownerName}" nenalezen`);
    }
  }

  // Update lead data
  if (Object.keys(data).length > 0) {
    await client.updateLead(id, data);
    console.log(`✓ Lead ${id} aktualizován`);
  }

  // Handle tags
  if (tags) {
    // Set tags (replace all)
    await client.setLeadTags(id, tags);
    console.log(`✓ Tagy nastaveny: ${tags.join(", ")}`);
  } else {
    // Add tags
    if (addTags) {
      for (const tag of addTags) {
        await client.addLeadTag(id, tag);
      }
      console.log(`✓ Tagy přidány: ${addTags.join(", ")}`);
    }

    // Remove tags
    if (removeTags) {
      for (const tag of removeTags) {
        await client.removeLeadTag(id, tag);
      }
      console.log(`✓ Tagy odebrány: ${removeTags.join(", ")}`);
    }
  }

  console.log(`  URL: https://app.raynet.cz/gimmedata/?view=DetailView&en=Lead&ei=${id}`);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
