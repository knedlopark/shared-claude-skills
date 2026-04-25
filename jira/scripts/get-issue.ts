#!/usr/bin/env npx tsx
/**
 * Získání detailů Jira issue
 *
 * Použití:
 *   npx tsx get-issue.ts <ISSUE-KEY> [--comments] [--attachments] [--json]
 *
 * Příklady:
 *   npx tsx get-issue.ts ABC-123
 *   npx tsx get-issue.ts ABC-123 --comments
 *   npx tsx get-issue.ts ABC-123 --json          # raw JSON včetně custom fields
 *   npx tsx get-issue.ts ABC-123 --comments --attachments
 */

import { JiraClient, formatIssue, getBrowseUrl } from "./lib/jira-client.js";

const args = process.argv.slice(2);
const issueKey = args.find((a) => !a.startsWith("--"));
const includeComments = args.includes("--comments");
const includeAttachments = args.includes("--attachments");
const outputJson = args.includes("--json");

if (!issueKey) {
  console.error("Použití: npx tsx get-issue.ts <ISSUE-KEY> [--comments] [--attachments] [--json]");
  console.error("Příklad: npx tsx get-issue.ts ABC-123 --comments");
  console.error("         npx tsx get-issue.ts ABC-123 --json  # raw JSON včetně custom fields");
  process.exit(1);
}

async function main() {
  const client = JiraClient.forIssue(issueKey!);

  try {
    const issue = await client.getIssue(issueKey!);

    if (outputJson) {
      console.log(JSON.stringify(issue, null, 2));
    } else {
      console.log(formatIssue(issue, includeComments, includeAttachments));

      // Show web links (remote links)
      try {
        const remoteLinks = await client.getRemoteLinks(issueKey!);
        if (remoteLinks.length > 0) {
          console.log(`\n--- Web Links ---`);
          for (const link of remoteLinks) {
            console.log(`  [${link.id}] ${link.object.title}: ${link.object.url}`);
          }
        }
      } catch {
        // Remote links may not be available, skip silently
      }

      console.log(`\nURL: ${getBrowseUrl(issue.key)}`);
    }
  } catch (error) {
    console.error(`Chyba: ${error}`);
    process.exit(1);
  }
}

main();
