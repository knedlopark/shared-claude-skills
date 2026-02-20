#!/usr/bin/env npx tsx
/**
 * List sprints for a board
 *
 * Usage:
 *   npx tsx list-sprints.ts --board=<BOARD-ID> [--state=active|closed|future] [--instance=NAME]
 *
 * Examples:
 *   npx tsx list-sprints.ts --board=110
 *   npx tsx list-sprints.ts --board=110 --state=active
 *   npx tsx list-sprints.ts --board=110 --state=future
 */

import { JiraClient } from "./lib/jira-client.js";

const args = process.argv.slice(2);
const boardArg = args.find((a) => a.startsWith("--board="));
const stateArg = args.find((a) => a.startsWith("--state="));
const instanceArg = args.find((a) => a.startsWith("--instance="));

if (!boardArg) {
  console.error("Usage: npx tsx list-sprints.ts --board=<BOARD-ID> [--state=active|closed|future]");
  console.error("");
  console.error("Examples:");
  console.error("  npx tsx list-sprints.ts --board=110");
  console.error("  npx tsx list-sprints.ts --board=110 --state=active");
  process.exit(1);
}

const boardId = boardArg.substring(8);
const state = stateArg ? stateArg.substring(8) : undefined;

async function main() {
  const client = instanceArg
    ? JiraClient.forInstance(instanceArg.split("=")[1])
    : new JiraClient();
  const config = client.getConfig();

  let url = `${config.url}/rest/agile/1.0/board/${boardId}/sprint`;
  if (state) {
    url += `?state=${state}`;
  }

  const auth = client.getAuthHeader();

  const response = await fetch(url, {
    headers: { Authorization: auth },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`Error: ${error}`);
    process.exit(1);
  }

  const data = await response.json();
  const sprints = data.values || [];

  if (sprints.length === 0) {
    console.log("No sprints found.");
    return;
  }

  console.log(`Found ${sprints.length} sprints:\n`);
  console.log("ID\tState\t\tName\t\t\tStart\t\t\tEnd");
  console.log("-".repeat(80));

  for (const sprint of sprints) {
    const start = sprint.startDate ? new Date(sprint.startDate).toLocaleDateString() : "-";
    const end = sprint.endDate ? new Date(sprint.endDate).toLocaleDateString() : "-";
    const stateStr = sprint.state.padEnd(8);
    console.log(`${sprint.id}\t${stateStr}\t${sprint.name.padEnd(20)}\t${start}\t\t${end}`);
  }
}

main();
