#!/usr/bin/env npx tsx
/**
 * Přidání komentáře k Jira issue
 *
 * Použití:
 *   npx tsx add-comment.ts <ISSUE-KEY> "TEXT"
 *   npx tsx add-comment.ts <ISSUE-KEY> --file=PATH
 *   npx tsx add-comment.ts <ISSUE-KEY> --adf='<ADF-JSON>'
 *
 * Text podporuje formátování:
 *   *bold*, _italic_, [text|url], # heading, - list, ||h||h|| + |c|c| tabulka
 *
 * Příklady:
 *   npx tsx add-comment.ts ABC-123 "Toto je komentář"
 *   npx tsx add-comment.ts ABC-123 --file=./comment.md
 *   npx tsx add-comment.ts ABC-123 "### Nadpis
 *   - položka 1
 *   - položka 2"
 *   npx tsx add-comment.ts ABC-123 --adf='{"version":1,"type":"doc","content":[...]}'
 */

import * as fs from "fs";
import { JiraClient } from "./lib/jira-client.js";

const args = process.argv.slice(2);
const issueKey = args[0];

// Kontrola --adf flag
const adfArg = args.find(a => a.startsWith("--adf="));
// Kontrola --file flag
const fileArg = args.find(a => a.startsWith("--file="));
let body: string | object;

if (adfArg) {
  // Přímý ADF JSON
  const adfJson = adfArg.substring(6); // odstranit "--adf="
  try {
    body = JSON.parse(adfJson);
  } catch {
    console.error("Chyba: Neplatný ADF JSON");
    process.exit(1);
  }
} else if (fileArg) {
  // Načíst komentář ze souboru
  const filePath = fileArg.substring(7); // odstranit "--file="
  if (!fs.existsSync(filePath)) {
    console.error(`Chyba: Soubor "${filePath}" neexistuje.`);
    process.exit(1);
  }
  body = fs.readFileSync(filePath, "utf-8").trim();
} else {
  // Textový komentář (bude převeden přes textToAdf)
  body = args.slice(1).join(" ");
}

if (!issueKey || !body) {
  console.error('Použití: npx tsx add-comment.ts <ISSUE-KEY> "TEXT"');
  console.error('        npx tsx add-comment.ts <ISSUE-KEY> --file=PATH');
  console.error('        npx tsx add-comment.ts <ISSUE-KEY> --adf=\'<ADF-JSON>\'');
  console.error('');
  console.error('Příklad: npx tsx add-comment.ts ABC-123 "Toto je komentář"');
  console.error('         npx tsx add-comment.ts ABC-123 --file=./comment.md');
  process.exit(1);
}

async function main() {
  const client = JiraClient.forIssue(issueKey);

  try {
    const comment = await client.addComment(issueKey, body);
    console.log(`✓ Komentář přidán k ${issueKey}`);
    console.log(`  ID: ${comment.id}`);
    console.log(`  Čas: ${new Date(comment.created).toLocaleString()}`);
  } catch (error) {
    console.error(`Chyba: ${error}`);
    process.exit(1);
  }
}

main();
