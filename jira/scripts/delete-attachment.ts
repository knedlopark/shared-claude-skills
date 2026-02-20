#!/usr/bin/env npx tsx
/**
 * Smazání přílohy z Jira issue
 *
 * Použití:
 *   npx tsx delete-attachment.ts <ISSUE-KEY> <ATTACHMENT-ID> [--force]
 *   npx tsx delete-attachment.ts <ISSUE-KEY> --filename=<FILENAME> [--force]
 *
 * Příklady:
 *   npx tsx delete-attachment.ts OPS-123 12345 --force
 *   npx tsx delete-attachment.ts OPS-123 --filename=feedback.md --force
 *
 * Bez --force skript zobrazí info o příloze a vyžaduje potvrzení.
 *
 * Tip: Pro zjištění ID přílohy použij:
 *   npx tsx download-attachment.ts OPS-123 --list
 */

import * as readline from "readline";
import { JiraClient, JiraAttachment } from "./lib/jira-client.js";

const args = process.argv.slice(2);
const forceFlag = args.includes("--force");
const filteredArgs = args.filter((a) => a !== "--force");

const issueKey = filteredArgs.find((a) => !a.startsWith("--") && /^[A-Z]+-\d+$/.test(a));
const attachmentId = filteredArgs.find((a) => !a.startsWith("--") && /^\d+$/.test(a));
const filenameArg = filteredArgs.find((a) => a.startsWith("--filename="));
const filename = filenameArg?.replace("--filename=", "");

if (!issueKey || (!attachmentId && !filename)) {
  console.error("Použití:");
  console.error("  npx tsx delete-attachment.ts <ISSUE-KEY> <ATTACHMENT-ID> [--force]");
  console.error("  npx tsx delete-attachment.ts <ISSUE-KEY> --filename=<FILENAME> [--force]");
  console.error("");
  console.error("Příklady:");
  console.error("  npx tsx delete-attachment.ts OPS-123 12345 --force");
  console.error("  npx tsx delete-attachment.ts OPS-123 --filename=feedback.md --force");
  console.error("");
  console.error("Bez --force skript zobrazí info a vyžaduje potvrzení.");
  console.error("");
  console.error("Tip: Pro zjištění ID přílohy použij:");
  console.error("  npx tsx download-attachment.ts OPS-123 --list");
  process.exit(1);
}

async function confirmDeletion(attachment: JiraAttachment, issueKey: string): Promise<boolean> {
  console.log("");
  console.log("----------------------------------------");
  console.log("  POZOR: Nevratná operace!");
  console.log("----------------------------------------");
  console.log(`  Soubor:  ${attachment.filename}`);
  console.log(`  Velikost: ${(attachment.size / 1024).toFixed(1)} KB`);
  console.log(`  Autor:   ${attachment.author.displayName}`);
  console.log(`  Datum:   ${new Date(attachment.created).toLocaleString()}`);
  console.log(`  Issue:   ${issueKey}`);
  console.log("----------------------------------------");
  console.log("");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question('Pro potvrzení napiš "DELETE": ', (answer) => {
      rl.close();
      resolve(answer.trim() === "DELETE");
    });
  });
}

async function main() {
  const client = JiraClient.forIssue(issueKey!);

  try {
    // Vždy načteme issue, abychom mohli zobrazit info o příloze
    const issue = await client.getIssue(issueKey!);
    const attachments = issue.fields.attachment || [];

    if (attachments.length === 0) {
      console.error(`Issue ${issueKey} nemá žádné přílohy.`);
      process.exit(1);
    }

    let targetAttachment: JiraAttachment | undefined;

    // Hledáme přílohu podle ID nebo filename
    if (attachmentId) {
      targetAttachment = attachments.find((a) => a.id === attachmentId);
      if (!targetAttachment) {
        console.error(`Chyba: Příloha s ID ${attachmentId} nenalezena.`);
        console.error(`Dostupné přílohy:`);
        for (const att of attachments) {
          console.error(`  ID: ${att.id} - ${att.filename} (${(att.size / 1024).toFixed(1)} KB)`);
        }
        process.exit(1);
      }
    } else if (filename) {
      const matchingAttachments = attachments.filter((a) => a.filename === filename);

      if (matchingAttachments.length === 0) {
        console.error(`Chyba: Příloha "${filename}" nenalezena.`);
        console.error(`Dostupné přílohy: ${attachments.map((a) => a.filename).join(", ")}`);
        process.exit(1);
      }

      if (matchingAttachments.length > 1) {
        console.error(`Chyba: Nalezeno více příloh s názvem "${filename}":`);
        for (const att of matchingAttachments) {
          console.error(`  ID: ${att.id} - ${new Date(att.created).toLocaleString()} (${(att.size / 1024).toFixed(1)} KB)`);
        }
        console.error("");
        console.error("Použij konkrétní ID pro smazání:");
        console.error(`  npx tsx delete-attachment.ts ${issueKey} <ID> --force`);
        process.exit(1);
      }

      targetAttachment = matchingAttachments[0];
    }

    if (!targetAttachment) {
      console.error("Chyba: Příloha nenalezena.");
      process.exit(1);
    }

    // Bez --force vyžadujeme potvrzení
    if (!forceFlag) {
      const confirmed = await confirmDeletion(targetAttachment, issueKey!);
      if (!confirmed) {
        console.log("Smazání zrušeno.");
        process.exit(0);
      }
    } else {
      console.log(`Mažu přílohu: ${targetAttachment.filename} (ID: ${targetAttachment.id})...`);
    }

    await client.deleteAttachment(targetAttachment.id);
    console.log(`Příloha "${targetAttachment.filename}" byla smazána.`);
  } catch (error) {
    console.error(`Chyba: ${error}`);
    process.exit(1);
  }
}

main();
