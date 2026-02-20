#!/usr/bin/env npx tsx
/**
 * Work with Jira users - search, get account ID
 *
 * Usage:
 *   npx tsx users.ts search <QUERY> [--instance=NAME]
 *   npx tsx users.ts me [--instance=NAME]
 *
 * Examples:
 *   npx tsx users.ts search "roman"
 *   npx tsx users.ts search "jakub@company.com"
 *   npx tsx users.ts me
 *   npx tsx users.ts me --instance=secondary
 */

import { JiraClient } from "./lib/jira-client.js";

const args = process.argv.slice(2);
const command = args.find((a) => !a.startsWith("--"));
const query = args.find((a, i) => !a.startsWith("--") && a !== command);
const instanceArg = args.find((a) => a.startsWith("--instance="));
const instance = instanceArg?.split("=")[1];

if (!command || (command === "search" && !query)) {
  console.error("Usage:");
  console.error("  npx tsx users.ts search <QUERY> [--instance=NAME]");
  console.error("  npx tsx users.ts me [--instance=NAME]");
  console.error("");
  console.error("Examples:");
  console.error('  npx tsx users.ts search "roman"');
  console.error("  npx tsx users.ts me");
  console.error("  npx tsx users.ts me --instance=secondary");
  process.exit(1);
}

async function main() {
  const client = instance ? JiraClient.forInstance(instance) : new JiraClient();

  try {
    if (command === "me") {
      const user = await client.getMyself();
      console.log("=== Current User ===\n");
      console.log(`Name:       ${user.displayName}`);
      console.log(`Email:      ${user.emailAddress}`);
      console.log(`Account ID: ${user.accountId}`);
      console.log("");
      console.log("For mention in comments use:");
      console.log(`  --adf='{"type":"mention","attrs":{"id":"${user.accountId}","text":"@${user.displayName}"}}'`);
    } else if (command === "search") {
      const users = await client.searchUsers(query!);

      if (users.length === 0) {
        console.log(`No users found for: "${query}"`);
        process.exit(0);
      }

      console.log(`Found ${users.length} user(s):\n`);
      for (const user of users) {
        console.log(`[${user.accountId}]`);
        console.log(`  Name:  ${user.displayName}`);
        console.log(`  Email: ${user.emailAddress || "(unavailable)"}`);
        console.log("");
      }
    } else {
      console.error(`Unknown command: ${command}`);
      console.error("Use 'search' or 'me'");
      process.exit(1);
    }
  } catch (error) {
    console.error(`Error: ${error}`);
    process.exit(1);
  }
}

main();
