#!/usr/bin/env npx tsx
/**
 * Vyhledávání Jira issues pomocí JQL
 *
 * Použití:
 *   npx tsx search.ts "<JQL>" [--max=N] [--instance=NAME]
 *
 * Příklady:
 *   npx tsx search.ts "project = ABC AND status = Open"
 *   npx tsx search.ts "assignee = currentUser() ORDER BY updated DESC"
 *   npx tsx search.ts "project = ABC" --max=10
 *   npx tsx search.ts "project = REK" --instance=rekapcz
 */

import { JiraClient } from "./lib/jira-client.js";

const args = process.argv.slice(2);
const jql = args.find((a) => !a.startsWith("--"));
const maxArg = args.find((a) => a.startsWith("--max="));
const maxResults = maxArg ? parseInt(maxArg.split("=")[1], 10) : 50;
const instanceArg = args.find((a) => a.startsWith("--instance="));
const instance = instanceArg?.split("=")[1];

// Try to extract project from JQL for automatic instance selection
function extractProjectFromJql(jql: string): string | null {
  const match = jql.match(/project\s*=\s*["']?(\w+)["']?/i);
  return match ? match[1] : null;
}

if (!jql) {
  console.error('Použití: npx tsx search.ts "<JQL>" [--max=N] [--instance=NAME]');
  console.error('Příklad: npx tsx search.ts "project = ABC AND status = Open"');
  console.error('         npx tsx search.ts "project = REK" --instance=rekapcz');
  process.exit(1);
}

async function main() {
  let client: JiraClient;
  if (instance) {
    client = JiraClient.forInstance(instance);
  } else {
    // Try automatic detection from JQL
    const project = extractProjectFromJql(jql);
    client = project ? JiraClient.forIssue(project) : new JiraClient();
  }

  try {
    const result = await client.search(jql, maxResults);

    const total = result.total ?? result.issues.length;
    console.log(`Nalezeno ${total} issues (zobrazuji ${result.issues.length}):\n`);

    for (const issue of result.issues) {
      const assignee = issue.fields.assignee?.displayName || "Unassigned";
      const status = issue.fields.status.name;
      const type = issue.fields.issuetype.name;
      const labels = issue.fields.labels?.length > 0 ? issue.fields.labels.join(", ") : "";

      console.log(`${issue.key.padEnd(12)} [${status}] ${issue.fields.summary}`);
      console.log(`             Type: ${type} | Assignee: ${assignee}${labels ? ` | Labels: ${labels}` : ""}`);
      console.log("");
    }

    if (total > result.issues.length) {
      console.log(`... a dalších ${total - result.issues.length} issues`);
    }
  } catch (error) {
    console.error(`Chyba: ${error}`);
    process.exit(1);
  }
}

main();
