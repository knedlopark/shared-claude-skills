#!/usr/bin/env npx tsx
/**
 * List users from Jira projects
 *
 * Usage:
 *   npx tsx list-users.ts [PROJECT_KEY...]
 *
 * Examples:
 *   npx tsx list-users.ts DEV OPS CUST       # Users from specific projects
 *   npx tsx list-users.ts                     # Users assigned to current user's issues
 */

import { JiraClient } from "./lib/jira-client.js";

async function main() {
  const projects = process.argv.slice(2).filter(a => !a.startsWith("--"));
  const client = new JiraClient();

  let jql: string;
  if (projects.length > 0) {
    jql = `project in (${projects.join(", ")}) AND updated >= -90d`;
  } else {
    jql = `assignee = currentUser() AND updated >= -90d`;
  }

  const result = await client.search(jql, 100);

  const users = new Map<string, { name: string; email: string }>();

  for (const issue of result.issues) {
    if (issue.fields.assignee?.emailAddress) {
      const a = issue.fields.assignee;
      users.set(a.emailAddress, { name: a.displayName, email: a.emailAddress });
    }
    if (issue.fields.reporter?.emailAddress) {
      const r = issue.fields.reporter;
      users.set(r.emailAddress, { name: r.displayName, email: r.emailAddress });
    }
  }

  console.log("Found users:\n");

  const sorted = [...users.values()].sort((a, b) => a.name.localeCompare(b.name));

  for (const user of sorted) {
    const nameParts = user.name.split(" ");
    const initials = nameParts
      .map((p) => p[0]?.toUpperCase())
      .filter(Boolean)
      .join("");
    console.log(`${initials.padEnd(4)} | ${user.name.padEnd(25)} | ${user.email}`);
  }
}

main();
