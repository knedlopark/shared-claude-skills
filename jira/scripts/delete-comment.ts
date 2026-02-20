#!/usr/bin/env npx tsx
/**
 * Smazání komentáře z Jira issue
 *
 * Použití:
 *   npx tsx delete-comment.ts <ISSUE-KEY> <COMMENT-ID>
 *
 * Příklady:
 *   npx tsx delete-comment.ts ABC-123 12345
 */

import { JiraClient } from "./lib/jira-client.js";

const args = process.argv.slice(2);
const issueKey = args[0];
const commentId = args[1];

if (!issueKey || !commentId) {
  console.error("Použití: npx tsx delete-comment.ts <ISSUE-KEY> <COMMENT-ID>");
  console.error("Příklad: npx tsx delete-comment.ts ABC-123 12345");
  process.exit(1);
}

async function main() {
  const client = JiraClient.forIssue(issueKey);

  try {
    await client.deleteComment(issueKey, commentId);
    console.log(`✓ Komentář ${commentId} smazán z ${issueKey}`);
  } catch (error) {
    console.error(`Chyba: ${error}`);
    process.exit(1);
  }
}

main();
