#!/usr/bin/env npx tsx
/**
 * Přesun Jira issue(s) mezi projekty pomocí Bulk Move API
 *
 * ⚠️ BETA API: Bulk Move API je v beta verzi (dostupné od 09/2024).
 * Rate limiting: max 5 concurrent requests.
 *
 * Použití:
 *   npx tsx move-issue.ts <ISSUE-KEY> --to-project=<PROJECT-KEY> [options]
 *   npx tsx move-issue.ts <ISSUE-KEY1> <ISSUE-KEY2> ... --to-project=<PROJECT-KEY>
 *
 * Povinné parametry:
 *   --to-project=KEY     Cílový projekt (např. DEV, OPS)
 *
 * Volitelné parametry:
 *   --to-type=NAME       Cílový typ issue (výchozí: zachová původní)
 *   --include-children   Přesunout i child issues (subtasks)
 *   --dry-run            Pouze zobrazit co by se přesunulo
 *
 * Příklady:
 *   npx tsx move-issue.ts OPS-123 --to-project=DEV
 *   npx tsx move-issue.ts OPS-123 OPS-124 --to-project=DEV
 *   npx tsx move-issue.ts OPS-123 --to-project=DEV --to-type=Bug
 *   npx tsx move-issue.ts OPS-123 --to-project=DEV --include-children
 *   npx tsx move-issue.ts OPS-123 --to-project=DEV --dry-run
 *
 * Reference:
 *   https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-bulk-operations/
 */

import { JiraClient, loadConfigForProject, getBrowseUrl, JiraIssue } from "./lib/jira-client.js";

interface BulkMoveRequest {
  sendBulkNotification: boolean;
  targetToSourcesMapping: {
    [key: string]: {
      inferFieldDefaults: boolean;
      inferStatusDefaults: boolean;
      inferSubtaskTypeDefault: boolean;
      issueIdsOrKeys: string[];
    };
  };
}

interface BulkMoveResponse {
  taskId?: string;
  errors?: { message: string }[];
}

function parseArgs(): {
  issueKeys: string[];
  toProject: string;
  toType: string | null;
  includeChildren: boolean;
  dryRun: boolean;
} {
  const args = process.argv.slice(2);
  const issueKeys: string[] = [];
  let toProject = "";
  let toType: string | null = null;
  let includeChildren = false;
  let dryRun = false;

  for (const arg of args) {
    if (arg.startsWith("--to-project=")) {
      toProject = arg.replace("--to-project=", "");
    } else if (arg.startsWith("--to-type=")) {
      toType = arg.replace("--to-type=", "");
    } else if (arg === "--include-children") {
      includeChildren = true;
    } else if (arg === "--dry-run") {
      dryRun = true;
    } else if (!arg.startsWith("--") && arg.match(/^[A-Z]+-\d+$/)) {
      issueKeys.push(arg);
    }
  }

  return { issueKeys, toProject, toType, includeChildren, dryRun };
}

async function getChildIssues(client: JiraClient, parentKey: string): Promise<string[]> {
  const result = await client.search(`parent = ${parentKey}`, 100);
  return result.issues.map((issue: JiraIssue) => issue.key);
}

async function getProjectId(client: JiraClient, projectKey: string): Promise<string> {
  const projects = await client.getProjects();
  const project = projects.find((p) => p.key.toUpperCase() === projectKey.toUpperCase());
  if (!project) {
    throw new Error(`Projekt "${projectKey}" nenalezen.`);
  }
  // Get full project details to get ID
  const response = await fetch(
    `${loadConfigForProject(projectKey).url}/rest/api/3/project/${projectKey}`,
    {
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${loadConfigForProject(projectKey).email}:${loadConfigForProject(projectKey).apiToken}`
        ).toString("base64")}`,
      },
    }
  );
  if (!response.ok) {
    throw new Error(`Nelze získat ID projektu: ${await response.text()}`);
  }
  const projectData = (await response.json()) as { id: string };
  return projectData.id;
}

async function getIssueTypeId(
  client: JiraClient,
  projectKey: string,
  typeName: string
): Promise<string> {
  const issueTypes = await client.getIssueTypes(projectKey);
  const issueType = issueTypes.find(
    (t) => t.name.toLowerCase() === typeName.toLowerCase()
  );
  if (!issueType) {
    throw new Error(
      `Typ issue "${typeName}" nenalezen v projektu ${projectKey}. Dostupné: ${issueTypes.map((t) => t.name).join(", ")}`
    );
  }
  // Get issue type ID - need to fetch from project metadata
  const config = loadConfigForProject(projectKey);
  const response = await fetch(
    `${config.url}/rest/api/3/issuetype/project?projectId=${await getProjectId(client, projectKey)}`,
    {
      headers: {
        Authorization: `Basic ${Buffer.from(`${config.email}:${config.apiToken}`).toString("base64")}`,
      },
    }
  );
  if (!response.ok) {
    throw new Error(`Nelze získat typy issue: ${await response.text()}`);
  }
  const types = (await response.json()) as { id: string; name: string }[];
  const type = types.find((t) => t.name.toLowerCase() === typeName.toLowerCase());
  if (!type) {
    throw new Error(`Typ issue "${typeName}" nenalezen.`);
  }
  return type.id;
}

async function bulkMoveIssues(
  issueKeys: string[],
  targetProjectKey: string,
  targetTypeId: string | null
): Promise<BulkMoveResponse> {
  // Use config from first issue
  const config = loadConfigForProject(issueKeys[0]);
  const client = JiraClient.forIssue(issueKeys[0]);

  // Get target project ID
  const projectId = await getProjectId(client, targetProjectKey);

  // Build mapping key: "projectKey,projectId" or "projectKey,projectId,issueTypeId"
  let mappingKey = `${targetProjectKey},${projectId}`;
  if (targetTypeId) {
    mappingKey += `,${targetTypeId}`;
  }

  const requestBody: BulkMoveRequest = {
    sendBulkNotification: true,
    targetToSourcesMapping: {
      [mappingKey]: {
        inferFieldDefaults: true,
        inferStatusDefaults: true,
        inferSubtaskTypeDefault: true,
        issueIdsOrKeys: issueKeys,
      },
    },
  };

  const response = await fetch(`${config.url}/rest/api/3/bulk/issues/move`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${config.email}:${config.apiToken}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Bulk Move API error (${response.status}): ${errorText}`);
  }

  return response.json();
}

const { issueKeys, toProject, toType, includeChildren, dryRun } = parseArgs();

if (issueKeys.length === 0 || !toProject) {
  console.error("Použití: npx tsx move-issue.ts <ISSUE-KEY> --to-project=<PROJECT-KEY> [options]");
  console.error("");
  console.error("Povinné: --to-project=KEY");
  console.error("Volitelné: --to-type=NAME, --include-children, --dry-run");
  console.error("");
  console.error("Příklady:");
  console.error('  npx tsx move-issue.ts OPS-123 --to-project=DEV');
  console.error('  npx tsx move-issue.ts OPS-123 --to-project=DEV --to-type=Bug');
  console.error('  npx tsx move-issue.ts OPS-123 --to-project=DEV --include-children');
  console.error("");
  console.error("⚠️  BETA API: Bulk Move API je v beta verzi (dostupné od 09/2024).");
  console.error("   Rate limiting: max 5 concurrent requests.");
  process.exit(1);
}

async function main() {
  const client = JiraClient.forIssue(issueKeys[0]);

  try {
    // Collect all issue keys to move
    let allIssueKeys = [...issueKeys];

    // Get child issues if requested
    if (includeChildren) {
      console.log("Hledám child issues...");
      for (const key of issueKeys) {
        const children = await getChildIssues(client, key);
        if (children.length > 0) {
          console.log(`  ${key}: ${children.length} child issues (${children.join(", ")})`);
          allIssueKeys.push(...children);
        }
      }
      // Remove duplicates
      allIssueKeys = [...new Set(allIssueKeys)];
    }

    // Validate issue count
    if (allIssueKeys.length > 1000) {
      console.error(`Chyba: Nelze přesunout více než 1000 issues najednou (máte ${allIssueKeys.length}).`);
      process.exit(1);
    }

    // Get target type ID if specified
    let targetTypeId: string | null = null;
    if (toType) {
      targetTypeId = await getIssueTypeId(client, toProject, toType);
    }

    // Dry run - just show what would be moved
    if (dryRun) {
      console.log("\n=== DRY RUN ===");
      console.log(`Cílový projekt: ${toProject}`);
      if (toType) {
        console.log(`Cílový typ: ${toType}`);
      }
      console.log(`Issues k přesunu (${allIssueKeys.length}):`);
      for (const key of allIssueKeys) {
        console.log(`  - ${key}`);
      }
      console.log("\nPro skutečný přesun spusť příkaz bez --dry-run");
      return;
    }

    // Execute bulk move
    console.log(`Přesouvám ${allIssueKeys.length} issue(s) do projektu ${toProject}...`);

    const result = await bulkMoveIssues(allIssueKeys, toProject, targetTypeId);

    if (result.errors && result.errors.length > 0) {
      console.error("Chyby při přesunu:");
      for (const error of result.errors) {
        console.error(`  - ${error.message}`);
      }
      process.exit(1);
    }

    console.log(`\n✓ Úspěšně přesunuto ${allIssueKeys.length} issue(s) do projektu ${toProject}`);

    // Show new URLs
    for (const key of issueKeys) {
      // Issue key zůstává stejný, pouze projekt se změní v historii
      // Ale pro uživatele zobrazíme odkaz
      console.log(`  ${key} → ${getBrowseUrl(key)}`);
    }

    if (result.taskId) {
      console.log(`\nTask ID: ${result.taskId} (pro sledování průběhu)`);
    }

    console.log("\n⚠️  Poznámka: Issue key zůstává stejný, ale issue je nyní v projektu", toProject);

  } catch (error) {
    console.error(`Chyba: ${error}`);
    process.exit(1);
  }
}

main();
