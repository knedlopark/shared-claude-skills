#!/usr/bin/env npx tsx
/**
 * Change sprint state (close/start)
 *
 * Usage:
 *   npx tsx sprint-state.ts <SPRINT-ID> --close
 *   npx tsx sprint-state.ts <SPRINT-ID> --start --start-date=YYYY-MM-DD --end-date=YYYY-MM-DD
 *
 * WARNING: Before closing a sprint, you MUST move incomplete issues!
 *          Jira API does not auto-move them (unlike the UI).
 */

import { JiraClient } from "./lib/jira-client.js";

const args = process.argv.slice(2);
const sprintId = args.find((a: string) => !a.startsWith("--"));
const closeFlag = args.includes("--close");
const startFlag = args.includes("--start");
const startDateArg = args.find((a: string) => a.startsWith("--start-date="));
const endDateArg = args.find((a: string) => a.startsWith("--end-date="));

if (!sprintId || (!closeFlag && !startFlag)) {
  console.error("Usage:");
  console.error("  npx tsx sprint-state.ts <SPRINT-ID> --close");
  console.error("  npx tsx sprint-state.ts <SPRINT-ID> --start --start-date=YYYY-MM-DD --end-date=YYYY-MM-DD");
  console.error("");
  console.error("WARNING: Before --close you MUST move incomplete issues using move-to-sprint.ts!");
  process.exit(1);
}

if (startFlag && (!startDateArg || !endDateArg)) {
  console.error("For --start you must provide --start-date and --end-date");
  process.exit(1);
}

async function main() {
  const client = new JiraClient();
  const config = client.getConfig();

  const url = `${config.url}/rest/agile/1.0/sprint/${sprintId}`;

  let body: Record<string, any>;
  if (closeFlag) {
    body = { state: "closed" };
    console.log(`Closing sprint ${sprintId}...`);
  } else {
    const startDate = startDateArg!.substring(13);
    const endDate = endDateArg!.substring(11);
    body = {
      state: "active",
      startDate: `${startDate}T00:00:00.000Z`,
      endDate: `${endDate}T23:59:59.000Z`,
    };
    console.log(`Activating sprint ${sprintId} (${startDate} - ${endDate})...`);
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: client.getAuthHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`Error: ${error}`);
    process.exit(1);
  }

  const result = await response.json();
  console.log(`Done: Sprint "${result.name}" - state changed to: ${result.state}`);
}

main();
