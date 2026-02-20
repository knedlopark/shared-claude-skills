#!/usr/bin/env npx tsx
/**
 * Stažení přílohy z Jira issue
 *
 * Použití:
 *   npx tsx download-attachment.ts <ISSUE-KEY> <FILENAME> [OUTPUT-PATH]
 *   npx tsx download-attachment.ts <ISSUE-KEY> --list
 *
 * Příklady:
 *   npx tsx download-attachment.ts OPS-123 --list
 *   npx tsx download-attachment.ts OPS-123 feedback-2024-01-15.md
 *   npx tsx download-attachment.ts OPS-123 feedback-2024-01-15.md ./downloaded.md
 */

import fs from "fs";
import path from "path";
import { JiraClient, loadConfigForProject } from "./lib/jira-client.js";

const args = process.argv.slice(2);
const issueKey = args.find((a) => !a.startsWith("--") && !a.includes("/") && !a.includes("."));
const listMode = args.includes("--list");
const filename = args.find((a, i) => !a.startsWith("--") && a !== issueKey && (a.includes(".") || i > 0));
const outputPath = args.find((a, i) => !a.startsWith("--") && a !== issueKey && a !== filename);

if (!issueKey) {
  console.error("Použití:");
  console.error("  npx tsx download-attachment.ts <ISSUE-KEY> --list");
  console.error("  npx tsx download-attachment.ts <ISSUE-KEY> <FILENAME> [OUTPUT-PATH]");
  console.error("");
  console.error("Příklady:");
  console.error("  npx tsx download-attachment.ts OPS-123 --list");
  console.error("  npx tsx download-attachment.ts OPS-123 feedback.md");
  console.error("  npx tsx download-attachment.ts OPS-123 feedback.md ./output.md");
  process.exit(1);
}

async function downloadFile(url: string, outputPath: string, authHeader: string): Promise<void> {
  const response = await fetch(url, {
    headers: { Authorization: authHeader },
  });

  if (!response.ok) {
    throw new Error(`Download failed (${response.status}): ${await response.text()}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(outputPath, buffer);
}

async function main() {
  const client = JiraClient.forIssue(issueKey!);
  const config = loadConfigForProject(issueKey!);
  const authHeader = `Basic ${Buffer.from(`${config.email}:${config.apiToken}`).toString("base64")}`;

  try {
    const issue = await client.getIssue(issueKey!);
    const attachments = issue.fields.attachment || [];

    if (attachments.length === 0) {
      console.log(`Issue ${issueKey} nemá žádné přílohy.`);
      process.exit(0);
    }

    // List mode
    if (listMode) {
      console.log(`Přílohy pro ${issueKey}:`);
      console.log("");
      for (const att of attachments) {
        const sizeKB = (att.size / 1024).toFixed(1);
        console.log(`  ${att.filename} (${sizeKB} KB)`);
        console.log(`    ID: ${att.id}`);
        console.log(`    Autor: ${att.author.displayName}`);
        console.log(`    Datum: ${new Date(att.created).toLocaleString()}`);
        console.log("");
      }
      process.exit(0);
    }

    // Download mode - need filename
    if (!filename) {
      console.error("Chyba: Zadej název souboru ke stažení.");
      console.error(`Dostupné přílohy: ${attachments.map((a) => a.filename).join(", ")}`);
      process.exit(1);
    }

    // Find attachment by filename
    const attachment = attachments.find((a) => a.filename === filename);
    if (!attachment) {
      console.error(`Chyba: Příloha "${filename}" nenalezena.`);
      console.error(`Dostupné přílohy: ${attachments.map((a) => a.filename).join(", ")}`);
      process.exit(1);
    }

    // Determine output path
    const finalOutputPath = outputPath || path.join(process.cwd(), attachment.filename);

    console.log(`Stahuji: ${attachment.filename}`);
    console.log(`URL: ${attachment.content}`);
    console.log(`Výstup: ${finalOutputPath}`);

    await downloadFile(attachment.content, finalOutputPath, authHeader);

    console.log(`✅ Staženo: ${finalOutputPath}`);
  } catch (error) {
    console.error(`Chyba: ${error}`);
    process.exit(1);
  }
}

main();
