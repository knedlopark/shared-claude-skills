#!/usr/bin/env npx tsx
/**
 * Odstranění propojení mezi Jira issues
 *
 * Použití:
 *   npx tsx unlink-issue.ts <ISSUE-KEY> <TARGET-KEY>
 *
 * Příklady:
 *   npx tsx unlink-issue.ts DEV-2719 DEV-2753
 */

import { JiraClient } from "./lib/jira-client.js";

const args = process.argv.slice(2);
const issueKey = args[0];
const targetKey = args[1];

if (!issueKey || !targetKey) {
  console.error("Použití: npx tsx unlink-issue.ts <ISSUE-KEY> <TARGET-KEY>");
  console.error("Příklad: npx tsx unlink-issue.ts DEV-2719 DEV-2753");
  process.exit(1);
}

async function main() {
  const client = JiraClient.forIssue(issueKey);

  try {
    // Získej issue s linky
    const issue = await client.getIssue(issueKey);
    const links = issue.fields.issuelinks || [];

    // Najdi link na cílový issue
    const link = links.find(
      (l) =>
        l.inwardIssue?.key === targetKey || l.outwardIssue?.key === targetKey
    );

    if (!link) {
      console.error(`Chyba: Propojení mezi ${issueKey} a ${targetKey} neexistuje.`);
      process.exit(1);
    }

    // Smaž link
    await client.deleteLink(link.id);
    console.log(`✓ Propojení mezi ${issueKey} a ${targetKey} odstraněno`);
  } catch (error) {
    console.error(`Chyba: ${error}`);
    process.exit(1);
  }
}

main();
