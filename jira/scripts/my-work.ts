#!/usr/bin/env npx tsx
/**
 * Přehled mé práce v Jira - předdefinované queries
 *
 * Použití:
 *   npx tsx my-work.ts <query-name> [--max=N] [--days=N] [--instance=NAME]
 *
 * Sekce v 'all' přehledu:
 *   active        - Moje aktivní práce (In Progress, In Review)
 *   todo          - Moje TODO (otevřené tasky podle priorit)
 *   sprint        - Moje issues v aktuálním sprintu
 *   watching      - Issues které sleduji (cizí)
 *
 * Samostatné queries:
 *   overdue       - Moje zpožděné issues
 *   reported      - Issues které jsem vytvořil
 *   mentions      - Issues kde jsem komentoval
 *
 * Příkazy:
 *   all           - Zobrazí všechny 4 hlavní sekce
 *
 * Příklady:
 *   npx tsx my-work.ts all --max=5
 *   npx tsx my-work.ts active
 *   npx tsx my-work.ts todo
 *   npx tsx my-work.ts overdue
 */

import { JiraClient } from "./lib/jira-client.js";

interface QueryConfig {
  name: string;
  jql: (days: number) => string;
  icon: string;
  includeInAll: boolean;
}

const QUERIES: Record<string, QueryConfig> = {
  // === Sekce zahrnuté v 'all' ===
  active: {
    name: "Moje aktivní práce",
    jql: () => `assignee = currentUser() AND status IN ("In Progress", "In Review") ORDER BY updated DESC`,
    icon: "🔥",
    includeInAll: true,
  },
  todo: {
    name: "Moje TODO (podle priorit)",
    jql: () => `assignee = currentUser() AND status NOT IN (Resolved, Closed, Done, Billed, "In Progress", "In Review") ORDER BY priority DESC, updated DESC`,
    icon: "📋",
    includeInAll: true,
  },
  sprint: {
    name: "Aktuální sprint",
    jql: () => `assignee = currentUser() AND sprint in openSprints() ORDER BY status ASC, priority DESC`,
    icon: "🏃",
    includeInAll: true,
  },
  watching: {
    name: "Issues které sleduji (cizí)",
    jql: (days) => `watcher = currentUser() AND assignee != currentUser() AND updated >= -${days}d ORDER BY updated DESC`,
    icon: "👀",
    includeInAll: true,
  },

  // === Samostatné queries ===
  overdue: {
    name: "Zpožděné issues",
    jql: () => `assignee = currentUser() AND duedate < now() AND status NOT IN (Done, Resolved, Closed, Billed) ORDER BY duedate ASC`,
    icon: "⚠️",
    includeInAll: false,
  },
  reported: {
    name: "Moje vytvořené issues",
    jql: (days) => `reporter = currentUser() AND created >= -${days}d ORDER BY created DESC`,
    icon: "📝",
    includeInAll: false,
  },
  mentions: {
    name: "Issues kde jsem komentoval",
    jql: (days) => `comment ~ currentUser() AND updated >= -${days}d ORDER BY updated DESC`,
    icon: "💬",
    includeInAll: false,
  },
};

function parseArgs(): { queryName: string; maxResults: number; days: number; instance?: string } {
  const args = process.argv.slice(2);
  const queryName = args.find((a) => !a.startsWith("--")) || "all";
  const maxArg = args.find((a) => a.startsWith("--max="));
  const daysArg = args.find((a) => a.startsWith("--days="));
  const instanceArg = args.find((a) => a.startsWith("--instance="));

  return {
    queryName,
    maxResults: maxArg ? parseInt(maxArg.split("=")[1], 10) : 10,
    days: daysArg ? parseInt(daysArg.split("=")[1], 10) : 7,
    instance: instanceArg?.split("=")[1],
  };
}

async function runQuery(
  client: JiraClient,
  _key: string,
  query: QueryConfig,
  maxResults: number,
  days: number
): Promise<void> {
  try {
    const jql = query.jql(days);
    const result = await client.search(jql, maxResults);

    console.log(`\n${query.icon} ${query.name} (${result.issues.length})`);
    console.log("─".repeat(50));

    if (result.issues.length === 0) {
      console.log("  Žádné issues");
      return;
    }

    for (const issue of result.issues) {
      const status = issue.fields.status.name;
      const updated = new Date(issue.fields.updated).toLocaleDateString("cs-CZ");
      console.log(`  ${issue.key.padEnd(12)} [${status}] ${issue.fields.summary.slice(0, 40)}`);
      console.log(`               Aktualizováno: ${updated}`);
    }
  } catch (error) {
    console.log(`\n${query.icon} ${query.name}`);
    console.log("─".repeat(50));
    console.log(`  Chyba: ${error}`);
  }
}

async function main() {
  const { queryName, maxResults, days, instance } = parseArgs();
  const client = instance ? JiraClient.forInstance(instance) : new JiraClient();

  console.log(`\n${"═".repeat(50)}`);
  console.log(`  MŮJ PŘEHLED JIRA (posledních ${days} dní)`);
  console.log(`${"═".repeat(50)}`);

  if (queryName === "all") {
    // Spusť pouze queries s includeInAll: true
    for (const [key, query] of Object.entries(QUERIES)) {
      if (query.includeInAll) {
        await runQuery(client, key, query, maxResults, days);
      }
    }
  } else if (queryName === "help" || queryName === "--help") {
    console.log("\nSekce v 'all' přehledu:");
    for (const [key, query] of Object.entries(QUERIES)) {
      if (query.includeInAll) {
        console.log(`  ${query.icon} ${key.padEnd(12)} - ${query.name}`);
      }
    }
    console.log("\nSamostatné queries:");
    for (const [key, query] of Object.entries(QUERIES)) {
      if (!query.includeInAll) {
        console.log(`  ${query.icon} ${key.padEnd(12)} - ${query.name}`);
      }
    }
    console.log("\nPoužití: npx tsx my-work.ts <query> [--max=N] [--days=N]");
  } else if (QUERIES[queryName]) {
    await runQuery(client, queryName, QUERIES[queryName], maxResults, days);
  } else {
    console.error(`Neznámý query: ${queryName}`);
    console.error(`Použij --help pro seznam dostupných queries`);
    process.exit(1);
  }

  console.log("");
}

main();
