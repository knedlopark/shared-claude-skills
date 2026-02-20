#!/usr/bin/env npx tsx
/**
 * Move issues to a sprint
 *
 * Usage:
 *   npx tsx move-to-sprint.ts <ISSUE-KEY...> --sprint=<SPRINT-ID>
 *   npx tsx move-to-sprint.ts <ISSUE-KEY...> --board=<BOARD-ID>  # uses active sprint
 *
 * Examples:
 *   npx tsx move-to-sprint.ts OPS-123 OPS-456 --sprint=1039
 *   npx tsx move-to-sprint.ts OPS-123 OPS-456 --board=110
 */

import { JiraClient } from "./lib/jira-client.js";

const args = process.argv.slice(2);
const sprintArg = args.find((a) => a.startsWith("--sprint="));
const boardArg = args.find((a) => a.startsWith("--board="));
const issues = args.filter((a) => !a.startsWith("--"));

if (issues.length === 0 || (!sprintArg && !boardArg)) {
  console.error("Usage: npx tsx move-to-sprint.ts <ISSUE-KEY...> --sprint=<SPRINT-ID>");
  console.error("       npx tsx move-to-sprint.ts <ISSUE-KEY...> --board=<BOARD-ID>");
  console.error("");
  console.error("Examples:");
  console.error("  npx tsx move-to-sprint.ts OPS-123 OPS-456 --sprint=1039");
  console.error("  npx tsx move-to-sprint.ts OPS-123 --board=110  # uses active sprint");
  process.exit(1);
}

async function getActiveSprint(client: JiraClient, boardId: string): Promise<{ id: number; name: string } | null> {
  const config = client.getConfig();
  const url = `${config.url}/rest/agile/1.0/board/${boardId}/sprint?state=active`;

  const response = await fetch(url, {
    headers: { Authorization: client.getAuthHeader() },
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  const sprints = data.values || [];
  return sprints.length > 0 ? { id: sprints[0].id, name: sprints[0].name } : null;
}

async function main() {
  const client = new JiraClient();
  const config = client.getConfig();

  let sprintId: number;
  let sprintName: string;

  if (sprintArg) {
    sprintId = parseInt(sprintArg.substring(9));
    sprintName = `sprint ${sprintId}`;
  } else {
    const boardId = boardArg!.substring(8);
    const activeSprint = await getActiveSprint(client, boardId);

    if (!activeSprint) {
      console.error(`Error: Board ${boardId} has no active sprint.`);
      process.exit(1);
    }

    sprintId = activeSprint.id;
    sprintName = activeSprint.name;
  }

  const url = `${config.url}/rest/agile/1.0/sprint/${sprintId}/issue`;
  const BATCH_SIZE = 50;

  const batches: string[][] = [];
  for (let i = 0; i < issues.length; i += BATCH_SIZE) {
    batches.push(issues.slice(i, i + BATCH_SIZE));
  }

  if (batches.length > 1) {
    console.log(`Moving ${issues.length} issues in ${batches.length} batches (limit 50/request)...`);
  }

  let movedCount = 0;
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: client.getAuthHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ issues: batch }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`Error in batch ${i + 1}: ${error}`);
      process.exit(1);
    }
    movedCount += batch.length;
    if (batches.length > 1) {
      console.log(`  Batch ${i + 1}/${batches.length}: ${batch.length} issues`);
    }
  }

  console.log(`Done: ${movedCount} issues moved to sprint ${sprintName}`);
}

main();
