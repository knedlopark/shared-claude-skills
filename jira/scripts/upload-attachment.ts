#!/usr/bin/env npx tsx
/**
 * Nahrání přílohy k Jira issue
 *
 * Použití:
 *   npx tsx upload-attachment.ts <ISSUE-KEY> <FILE-PATH>
 *
 * Příklady:
 *   npx tsx upload-attachment.ts ABC-123 ./screenshot.png
 *   npx tsx upload-attachment.ts ABC-123 /path/to/document.pdf
 */

import { JiraClient } from "./lib/jira-client.js";
import fs from "fs";
import path from "path";

const args = process.argv.slice(2);
const issueKey = args[0];
const filePath = args[1];

if (!issueKey || !filePath) {
  console.error("Použití: npx tsx upload-attachment.ts <ISSUE-KEY> <FILE-PATH>");
  console.error("Příklad: npx tsx upload-attachment.ts ABC-123 ./screenshot.png");
  process.exit(1);
}

const absolutePath = path.resolve(filePath);

if (!fs.existsSync(absolutePath)) {
  console.error(`Chyba: Soubor nenalezen: ${absolutePath}`);
  process.exit(1);
}

async function main() {
  const client = JiraClient.forIssue(issueKey);

  try {
    const stats = fs.statSync(absolutePath);
    console.log(`Nahrávám ${path.basename(absolutePath)} (${(stats.size / 1024).toFixed(1)} KB)...`);

    const attachments = await client.uploadAttachment(issueKey, absolutePath);

    for (const att of attachments) {
      console.log(`✓ Nahráno: ${att.filename}`);
      console.log(`  URL: ${att.content}`);
    }
  } catch (error) {
    console.error(`Chyba: ${error}`);
    process.exit(1);
  }
}

main();
