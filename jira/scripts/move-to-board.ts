#!/usr/bin/env npx tsx
/**
 * Přesun issue na board nebo do sprintu
 *
 * Použití:
 *   npx tsx move-to-board.ts <ISSUE-KEY> --board=<BOARD-ID>
 *   npx tsx move-to-board.ts <ISSUE-KEY> --sprint=<SPRINT-ID>
 *   npx tsx move-to-board.ts --list-boards
 *   npx tsx move-to-board.ts --list-sprints --board=<BOARD-ID>
 *
 * Parametry:
 *   --board=ID       ID boardu
 *   --sprint=ID      ID sprintu (pro scrum boardy)
 *   --list-boards    Zobrazí seznam dostupných boardů
 *   --list-sprints   Zobrazí sprinty pro daný board (vyžaduje --board)
 *   --to-backlog     Přesune issue do backlogu
 *
 * Příklady:
 *   npx tsx move-to-board.ts --list-boards
 *   npx tsx move-to-board.ts --list-sprints --board=110
 *   npx tsx move-to-board.ts OPS-577 --sprint=42
 *   npx tsx move-to-board.ts INFD-107 --board=5
 *
 * Poznámka:
 *   Board ID najdeš v URL boardu: https://xxx.atlassian.net/jira/software/projects/XXX/boards/5
 */

import { loadConfig, JiraConfig } from "./lib/jira-client.js";

interface Board {
  id: number;
  name: string;
  type: string;
  location?: {
    projectKey?: string;
    projectName?: string;
  };
}

interface BoardsResponse {
  maxResults: number;
  startAt: number;
  total: number;
  isLast: boolean;
  values: Board[];
}

interface Sprint {
  id: number;
  name: string;
  state: string;
  startDate?: string;
  endDate?: string;
  goal?: string;
}

interface SprintsResponse {
  maxResults: number;
  startAt: number;
  isLast: boolean;
  values: Sprint[];
}

class AgileClient {
  private config: JiraConfig;
  private baseUrl: string;
  private authHeader: string;

  constructor() {
    this.config = loadConfig();
    this.baseUrl = `${this.config.url}/rest/agile/1.0`;
    this.authHeader = `Basic ${Buffer.from(`${this.config.email}:${this.config.apiToken}`).toString("base64")}`;
  }

  async listBoards(): Promise<Board[]> {
    const response = await fetch(`${this.baseUrl}/board`, {
      method: "GET",
      headers: {
        Authorization: this.authHeader,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Jira API error (${response.status}): ${error}`);
    }

    const data: BoardsResponse = await response.json();
    return data.values;
  }

  async moveToBoard(boardId: number, issueKeys: string[]): Promise<void> {
    const response = await fetch(`${this.baseUrl}/board/${boardId}/issue`, {
      method: "POST",
      headers: {
        Authorization: this.authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        issues: issueKeys,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Jira API error (${response.status}): ${error}`);
    }
  }

  async moveToBacklog(boardId: number, issueKeys: string[]): Promise<void> {
    const response = await fetch(`${this.baseUrl}/backlog/${boardId}/issue`, {
      method: "POST",
      headers: {
        Authorization: this.authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        issues: issueKeys,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Jira API error (${response.status}): ${error}`);
    }
  }

  async listSprints(boardId: number): Promise<Sprint[]> {
    const response = await fetch(`${this.baseUrl}/board/${boardId}/sprint?state=active,future`, {
      method: "GET",
      headers: {
        Authorization: this.authHeader,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Jira API error (${response.status}): ${error}`);
    }

    const data: SprintsResponse = await response.json();
    return data.values;
  }

  async moveToSprint(sprintId: number, issueKeys: string[]): Promise<void> {
    const response = await fetch(`${this.baseUrl}/sprint/${sprintId}/issue`, {
      method: "POST",
      headers: {
        Authorization: this.authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        issues: issueKeys,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Jira API error (${response.status}): ${error}`);
    }
  }
}

function parseArgs(): {
  issueKey: string;
  boardId: number | null;
  sprintId: number | null;
  listBoards: boolean;
  listSprints: boolean;
  toBacklog: boolean;
} {
  const args = process.argv.slice(2);
  const issueKey = args.find((a) => !a.startsWith("--")) || "";
  let boardId: number | null = null;
  let sprintId: number | null = null;
  let listBoards = false;
  let listSprints = false;
  let toBacklog = false;

  for (const arg of args) {
    if (arg === "--list-boards") {
      listBoards = true;
    } else if (arg === "--list-sprints") {
      listSprints = true;
    } else if (arg === "--to-backlog") {
      toBacklog = true;
    } else if (arg.startsWith("--board=")) {
      boardId = parseInt(arg.replace("--board=", ""), 10);
    } else if (arg.startsWith("--sprint=")) {
      sprintId = parseInt(arg.replace("--sprint=", ""), 10);
    }
  }

  return { issueKey, boardId, sprintId, listBoards, listSprints, toBacklog };
}

async function main() {
  const { issueKey, boardId, sprintId, listBoards, listSprints, toBacklog } = parseArgs();
  const client = new AgileClient();

  if (listBoards) {
    const boards = await client.listBoards();
    console.log("Dostupné boardy:\n");
    console.log("ID\tTyp\t\tProjekt\t\tNázev");
    console.log("─".repeat(60));
    for (const board of boards) {
      const projectKey = board.location?.projectKey || "-";
      const type = board.type.padEnd(10);
      console.log(`${board.id}\t${type}\t${projectKey}\t\t${board.name}`);
    }
    return;
  }

  if (listSprints) {
    if (boardId === null) {
      console.error("Chyba: --list-sprints vyžaduje --board=<BOARD-ID>");
      process.exit(1);
    }
    const sprints = await client.listSprints(boardId);
    console.log(`Sprinty pro board ${boardId}:\n`);
    console.log("ID\tStav\t\tNázev");
    console.log("─".repeat(60));
    for (const sprint of sprints) {
      const state = sprint.state.padEnd(10);
      console.log(`${sprint.id}\t${state}\t${sprint.name}`);
    }
    return;
  }

  if (!issueKey) {
    console.error("Použití:");
    console.error("  npx tsx move-to-board.ts <ISSUE-KEY> --board=<BOARD-ID>");
    console.error("  npx tsx move-to-board.ts <ISSUE-KEY> --sprint=<SPRINT-ID>");
    console.error("  npx tsx move-to-board.ts --list-boards");
    console.error("  npx tsx move-to-board.ts --list-sprints --board=<BOARD-ID>");
    console.error("");
    console.error("Příklady:");
    console.error("  npx tsx move-to-board.ts --list-sprints --board=110");
    console.error("  npx tsx move-to-board.ts OPS-577 --sprint=42");
    console.error("  npx tsx move-to-board.ts INFD-107 --board=5");
    process.exit(1);
  }

  try {
    if (sprintId !== null) {
      await client.moveToSprint(sprintId, [issueKey]);
      console.log(`✓ Issue ${issueKey} přidáno do sprintu ${sprintId}`);
    } else if (toBacklog && boardId !== null) {
      await client.moveToBacklog(boardId, [issueKey]);
      console.log(`✓ Issue ${issueKey} přesunuto do backlogu boardu ${boardId}`);
    } else if (boardId !== null) {
      await client.moveToBoard(boardId, [issueKey]);
      console.log(`✓ Issue ${issueKey} přesunuto na board ${boardId}`);
    } else {
      console.error("Chyba: Musíš zadat --board nebo --sprint");
      process.exit(1);
    }
  } catch (error) {
    console.error(`Chyba: ${error}`);
    process.exit(1);
  }
}

main();
