#!/usr/bin/env npx tsx
/**
 * Update a Jira issue
 *
 * Usage:
 *   npx tsx update-issue.ts <ISSUE-KEY> [options]
 *
 * Optional:
 *   --summary="TEXT"      New title
 *   --description="TEXT"  New description (supports multi-line text and wiki markup)
 *   --description-file=PATH  New description from file
 *   --description-stdin   New description from stdin
 *   --type=NAME           Change issue type (e.g. "Task", "Bug")
 *   --priority=NAME       New priority
 *   --labels=a,b,c        New labels (replaces existing)
 *   --add-labels=a,b,c    Add labels (keeps existing)
 *   --status=NAME         Change status (uses transition)
 *   --assignee=VALUE      Assign to user (email, "me"/"mne" for self, or "none")
 *   --link=TYPE:KEY       Link to another issue (e.g. "blocks:ABC-456")
 *   --due=YYYY-MM-DD      Due date
 *   --fix-version=NAME    Set fixVersion (replaces existing)
 *   --add-fix-version=NAME  Add fixVersion (keeps existing)
 *   --remove-fix-version=NAME  Remove specific fixVersion
 *   --affected-version=NAME  Set affectedVersion
 *   --resolution=NAME     Set resolution when changing status (e.g. "Done", "Won't Do")
 *
 * Examples:
 *   npx tsx update-issue.ts ABC-123 --status="In Progress"
 *   npx tsx update-issue.ts ABC-123 --assignee=me
 *   npx tsx update-issue.ts ABC-123 --assignee=jan@company.com
 *   npx tsx update-issue.ts ABC-123 --assignee=none
 *   npx tsx update-issue.ts ABC-123 --link="Relates:ABC-456"
 */

import * as fs from "fs";
import { JiraClient, textToAdf } from "./lib/jira-client.js";

function parseArgs(): { issueKey: string; options: Record<string, string>; flags: Set<string> } {
  const args = process.argv.slice(2);
  const issueKey = args.find((a) => !a.startsWith("--"));
  const options: Record<string, string> = {};
  const flags = new Set<string>();

  for (const arg of args) {
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

  return { issueKey: issueKey || "", options, flags };
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

const { issueKey, options, flags } = parseArgs();

if (!issueKey) {
  console.error("Usage: npx tsx update-issue.ts <ISSUE-KEY> [options]");
  console.error("");
  console.error("Optional: --summary, --description, --description-file, --description-stdin, --type, --priority, --labels, --status, --assignee, --link");
  console.error("");
  console.error('Example: npx tsx update-issue.ts ABC-123 --status="In Progress"');
  process.exit(1);
}

async function main() {
  const client = JiraClient.forIssue(issueKey);
  let updated = false;

  try {
    // Update fields
    const fields: Record<string, unknown> = {};

    if (options.summary) fields.summary = options.summary;

    // Description - supports 3 methods: direct, from file, from stdin
    if (options.description) {
      fields.description = textToAdf(options.description);
    } else if (options["description-file"]) {
      const filePath = options["description-file"];
      if (!fs.existsSync(filePath)) {
        console.error(`Error: File "${filePath}" does not exist.`);
        process.exit(1);
      }
      const content = fs.readFileSync(filePath, "utf-8");
      fields.description = textToAdf(content);
    } else if (flags.has("description-stdin")) {
      const content = await readStdin();
      if (!content) {
        console.error("Error: No input from stdin.");
        process.exit(1);
      }
      fields.description = textToAdf(content);
    }

    // Type change
    if (options.type) {
      fields.issuetype = { name: options.type };
    }

    if (options.priority) fields.priority = { name: options.priority };
    if (options.labels) fields.labels = options.labels.split(",");
    if (options.due) fields.duedate = options.due;

    // Fix version - set (replaces existing)
    if (options["fix-version"]) {
      fields.fixVersions = [{ name: options["fix-version"] }];
    }

    // Affected version - set
    if (options["affected-version"]) {
      fields.versions = [{ name: options["affected-version"] }];
    }

    if (Object.keys(fields).length > 0) {
      await client.updateIssue(issueKey, fields);
      console.log(`Done: Updated: ${Object.keys(fields).join(", ")}`);
      updated = true;
    }

    // Change status via transition
    if (options.status) {
      const transitions = await client.getTransitions(issueKey);
      const transition = transitions.find(
        (t) => t.name.toLowerCase() === options.status.toLowerCase() ||
               t.to.name.toLowerCase() === options.status.toLowerCase()
      );

      if (!transition) {
        console.error(`Error: Status "${options.status}" is not available.`);
        console.error(`Available transitions: ${transitions.map((t) => t.name).join(", ")}`);
        process.exit(1);
      }

      const transitionFields: Record<string, unknown> = {};
      if (options.resolution) {
        transitionFields.resolution = { name: options.resolution };
      }

      await client.transitionIssue(issueKey, transition.id, transitionFields);
      console.log(`Done: Status changed to: ${transition.to.name}${options.resolution ? ` (resolution: ${options.resolution})` : ""}`);
      updated = true;
    }

    // Change assignee
    if (options.assignee) {
      const assigneeValue = options.assignee.toLowerCase();
      if (assigneeValue === "none") {
        await client.assignIssue(issueKey, null);
        console.log(`Done: Assignee removed`);
      } else if (assigneeValue === "me" || assigneeValue === "mne") {
        const myself = await client.getMyself();
        await client.assignIssue(issueKey, myself.accountId);
        console.log(`Done: Assigned to: ${myself.displayName} (me)`);
      } else {
        const users = await client.searchUsers(options.assignee);
        if (users.length === 0) {
          console.error(`Error: User "${options.assignee}" not found.`);
          process.exit(1);
        }
        await client.assignIssue(issueKey, users[0].accountId);
        console.log(`Done: Assigned to: ${users[0].displayName}`);
      }
      updated = true;
    }

    // Link issues
    if (options.link) {
      const [linkType, targetKey] = options.link.split(":");
      if (!linkType || !targetKey) {
        console.error('Error: Link format must be "TYPE:KEY" (e.g. "blocks:ABC-456")');
        process.exit(1);
      }
      await client.linkIssues(issueKey, targetKey, linkType);
      console.log(`Done: Linked: ${issueKey} ${linkType} ${targetKey}`);
      updated = true;
    }

    // Add fix version (keeps existing)
    if (options["add-fix-version"]) {
      const issue = await client.getIssue(issueKey);
      const currentVersions = issue.fields.fixVersions || [];
      const newVersions = [...currentVersions.map(v => ({ name: v.name })), { name: options["add-fix-version"] }];
      await client.updateIssue(issueKey, { fixVersions: newVersions });
      console.log(`Done: Added fixVersion: ${options["add-fix-version"]}`);
      updated = true;
    }

    // Remove fix version
    if (options["remove-fix-version"]) {
      const issue = await client.getIssue(issueKey);
      const currentVersions = issue.fields.fixVersions || [];
      const newVersions = currentVersions
        .filter(v => v.name !== options["remove-fix-version"])
        .map(v => ({ name: v.name }));
      await client.updateIssue(issueKey, { fixVersions: newVersions });
      console.log(`Done: Removed fixVersion: ${options["remove-fix-version"]}`);
      updated = true;
    }

    // Add labels (keeps existing)
    if (options["add-labels"]) {
      const issue = await client.getIssue(issueKey);
      const currentLabels: string[] = issue.fields.labels || [];
      const newLabels = options["add-labels"].split(",");
      const mergedLabels = [...new Set([...currentLabels, ...newLabels])];
      await client.updateIssue(issueKey, { labels: mergedLabels });
      console.log(`Done: Added labels: ${newLabels.join(", ")}`);
      updated = true;
    }

    if (!updated) {
      console.log("No changes made. Use --help for usage.");
    }
  } catch (error) {
    console.error(`Error: ${error}`);
    process.exit(1);
  }
}

main();
