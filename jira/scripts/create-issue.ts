#!/usr/bin/env npx tsx
/**
 * Create a new Jira issue
 *
 * Usage:
 *   npx tsx create-issue.ts --project=KEY --type=TYPE --summary="TEXT" [options]
 *
 * Required:
 *   --project=KEY       Project key (e.g. ABC)
 *   --type=TYPE         Issue type (Task, Bug, Story, Epic, Sub-task)
 *   --summary="TEXT"    Issue title
 *
 * Optional:
 *   --description="TEXT"    Issue description
 *   --description-file=PATH Description from file
 *   --description-stdin     Description from stdin
 *   --priority=NAME         Priority (Highest, High, Medium, Low, Lowest)
 *   --labels=a,b,c          Labels separated by comma
 *   --parent=KEY            Parent issue (for Sub-task)
 *   --due=YYYY-MM-DD        Due date
 *   --assignee=VALUE        Assign to user (email, "me"/"mne" for self)
 *
 * Examples:
 *   npx tsx create-issue.ts --project=ABC --type=Task --summary="New task"
 *   npx tsx create-issue.ts --project=ABC --type=Bug --summary="Fix bug" --priority=High
 *   npx tsx create-issue.ts --project=ABC --type=Task --summary="My task" --assignee=me
 */

import * as fs from "fs";
import { JiraClient, getBrowseUrl } from "./lib/jira-client.js";

function parseArgs(): { options: Record<string, string>; flags: Set<string> } {
  const options: Record<string, string> = {};
  const flags = new Set<string>();

  for (const arg of process.argv.slice(2)) {
    const matchWithValue = arg.match(/^--([\w-]+)=([\s\S]+)$/);
    if (matchWithValue) {
      options[matchWithValue[1]] = matchWithValue[2];
      continue;
    }
    const matchFlag = arg.match(/^--([\w-]+)$/);
    if (matchFlag) {
      flags.add(matchFlag[1]);
    }
  }

  return { options, flags };
}

function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("readable", () => {
      let chunk;
      while ((chunk = process.stdin.read()) !== null) {
        data += chunk;
      }
    });
    process.stdin.on("end", () => resolve(data.trim()));
    process.stdin.on("error", reject);
  });
}

const { options: args, flags } = parseArgs();

if (!args.project || !args.type || !args.summary) {
  console.error("Usage: npx tsx create-issue.ts --project=KEY --type=TYPE --summary=\"TEXT\"");
  console.error("");
  console.error("Required: --project, --type, --summary");
  console.error("Optional: --description, --description-file, --description-stdin, --priority, --labels, --parent, --assignee");
  console.error("");
  console.error('Example: npx tsx create-issue.ts --project=ABC --type=Task --summary="New task" --assignee=me');
  process.exit(1);
}

async function main() {
  const client = JiraClient.forIssue(args.project);

  try {
    // Description - supports 3 methods: direct, from file, from stdin
    let description = args.description;
    if (args["description-file"]) {
      const filePath = args["description-file"];
      if (!fs.existsSync(filePath)) {
        console.error(`Error: File "${filePath}" does not exist.`);
        process.exit(1);
      }
      description = fs.readFileSync(filePath, "utf-8");
    } else if (flags.has("description-stdin")) {
      description = await readStdin();
      if (!description) {
        console.error("Error: No input from stdin.");
        process.exit(1);
      }
    }

    // Resolve assignee - supports email, "me"/"mne" for self
    let assigneeAccountId: string | undefined;
    let assigneeDisplayName: string | undefined;
    if (args.assignee) {
      const assigneeValue = args.assignee.toLowerCase();
      if (assigneeValue === "me" || assigneeValue === "mne") {
        const myself = await client.getMyself();
        assigneeAccountId = myself.accountId;
        assigneeDisplayName = `${myself.displayName} (me)`;
      } else {
        const users = await client.searchUsers(args.assignee);
        if (users.length === 0) {
          console.error(`Error: User "${args.assignee}" not found.`);
          process.exit(1);
        }
        assigneeAccountId = users[0].accountId;
        assigneeDisplayName = users[0].displayName;
      }
    }

    const result = await client.createIssue({
      project: args.project,
      issueType: args.type,
      summary: args.summary,
      description: description,
      priority: args.priority,
      labels: args.labels?.split(","),
      parentKey: args.parent,
      dueDate: args.due,
      assignee: assigneeAccountId,
    });

    console.log(`Done: Issue created: ${result.key}`);
    if (assigneeDisplayName) {
      console.log(`  Assignee: ${assigneeDisplayName}`);
    }
    console.log(`  URL: ${getBrowseUrl(result.key)}`);
  } catch (error) {
    console.error(`Error: ${error}`);
    process.exit(1);
  }
}

main();
