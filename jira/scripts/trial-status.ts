#!/usr/bin/env npx tsx
/**
 * Get issues in a specific status with the date they transitioned to that status
 *
 * Usage:
 *   npx tsx trial-status.ts --project=KEY --status=STATUS
 *
 * Examples:
 *   npx tsx trial-status.ts --project=PI --status=Trial
 *   npx tsx trial-status.ts --project=SALES --status="In Review"
 */

import { JiraClient } from "./lib/jira-client.js";

const args = process.argv.slice(2);
const projectArg = args.find((a) => a.startsWith("--project="));
const statusArg = args.find((a) => a.startsWith("--status="));

if (!projectArg || !statusArg) {
  console.error("Usage: npx tsx trial-status.ts --project=KEY --status=STATUS");
  console.error("");
  console.error("Examples:");
  console.error('  npx tsx trial-status.ts --project=PI --status=Trial');
  console.error('  npx tsx trial-status.ts --project=SALES --status="In Review"');
  process.exit(1);
}

const project = projectArg.substring(10);
const status = statusArg.substring(9);

const client = new JiraClient();

interface StatusInfo {
  key: string;
  summary: string;
  statusDate: string;
  daysInStatus: number;
}

async function getStatusDate(issueKey: string): Promise<StatusInfo | null> {
  try {
    const response = await client.request<any>(
      "GET",
      `/issue/${issueKey}?expand=changelog`
    );
    const changelog = response.changelog?.histories || [];

    for (const history of changelog) {
      for (const item of history.items || []) {
        if (item.field === "status" && item.toString === status) {
          const statusDate = new Date(history.created);
          const today = new Date();
          const diffTime = today.getTime() - statusDate.getTime();
          const daysInStatus = Math.floor(diffTime / (1000 * 60 * 60 * 24));

          return {
            key: issueKey,
            summary: response.fields.summary,
            statusDate: history.created,
            daysInStatus,
          };
        }
      }
    }
    return null;
  } catch (error) {
    console.error(`Error fetching ${issueKey}: ${error}`);
    return null;
  }
}

async function main() {
  const searchResult = await client.search(
    `project = ${project} AND status = "${status}" ORDER BY updated ASC`,
    100
  );

  const issues = searchResult.issues || [];
  const results: StatusInfo[] = [];

  for (const issue of issues) {
    const info = await getStatusDate(issue.key);
    if (info) {
      results.push(info);
    }
  }

  results.sort((a, b) => b.daysInStatus - a.daysInStatus);

  console.log(JSON.stringify(results, null, 2));
}

main();
