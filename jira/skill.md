---
name: jira
description: Work with Jira issues - read, create, update, comment, attach, versions, and releases
---

# Jira Skill

This skill enables working with Jira issues via scripts in `scripts/`.

## Prerequisites

Set the following environment variables:

### Single instance (default)
```bash
export JIRA_URL="https://company.atlassian.net"
export JIRA_EMAIL="user@company.com"
export JIRA_API_TOKEN="your-api-token"
```

### Multiple instances

Use the pattern `JIRA_<NAME>_*` for additional instances:
```bash
# Primary instance
export JIRA_URL="https://company.atlassian.net"
export JIRA_EMAIL="user@company.com"
export JIRA_API_TOKEN="token1"

# Secondary instance
export JIRA_EXTERNAL_URL="https://external.atlassian.net"
export JIRA_EXTERNAL_EMAIL="user@external.com"
export JIRA_EXTERNAL_API_TOKEN="token2"
export JIRA_EXTERNAL_PROJECTS="PROJ3,PROJ4"
```

### Automatic instance selection

Scripts automatically select the correct instance based on:
1. **Issue key prefix** - e.g. `PROJ3-123` uses the instance with `PROJ3` in its `PROJECTS`
2. **Default instance** - `JIRA_URL`/`JIRA_EMAIL`/`JIRA_API_TOKEN`
3. **First named instance** - if no default is configured

## Available Scripts

All scripts are run with `npx tsx`.

### Overview

#### my-work.ts
Overview of my work - predefined queries for mentions, updates, sprint, etc.
```bash
npx tsx .claude/skills/jira/scripts/my-work.ts <query> [--max=N] [--days=N]
```
Available queries:
- `mentions` - Issues where I'm mentioned in comments
- `updated` - My issues with recent changes
- `assigned` - Newly assigned issues
- `watching` - Issues I'm watching
- `reported` - Issues I created
- `commented` - Issues where I commented
- `sprint` - My issues in current sprint
- `overdue` - My overdue issues
- `all` - Show all overviews

Examples:
- `npx tsx .claude/skills/jira/scripts/my-work.ts mentions`
- `npx tsx .claude/skills/jira/scripts/my-work.ts all --max=5 --days=7`

### Reading and Searching

#### get-issue.ts
Get issue details including comments and attachments.
```bash
npx tsx .claude/skills/jira/scripts/get-issue.ts <ISSUE-KEY> [--comments] [--attachments]
```
Examples:
- `npx tsx .claude/skills/jira/scripts/get-issue.ts ABC-123`
- `npx tsx .claude/skills/jira/scripts/get-issue.ts ABC-123 --comments --attachments`

#### search.ts
Search issues using JQL.
```bash
npx tsx .claude/skills/jira/scripts/search.ts "<JQL>" [--max=N]
```
Examples:
- `npx tsx .claude/skills/jira/scripts/search.ts "project = ABC AND status = Open"`
- `npx tsx .claude/skills/jira/scripts/search.ts "assignee = currentUser()" --max=10`

### Creating

#### create-issue.ts
Create a new issue.
```bash
npx tsx .claude/skills/jira/scripts/create-issue.ts --project=KEY --type=TYPE --summary="TEXT" [options]
```
Parameters:
- `--project` - project key (required)
- `--type` - issue type: Task, Bug, Story, Epic, Sub-task, or custom type (required)
- `--summary` - issue title (required)
- `--description` - description (optional)
- `--priority` - Highest, High, Medium, Low, Lowest (optional)
- `--labels` - labels separated by comma (optional)
- `--parent` - parent issue for Sub-task or Epic parent for Task (optional)
- `--due` - due date in YYYY-MM-DD format (optional)
- `--assignee` - assign to user (email, "me"/"mne" for self) (optional)

Examples:
```bash
npx tsx .claude/skills/jira/scripts/create-issue.ts --project=ABC --type=Task --summary="New task" --priority=High
npx tsx .claude/skills/jira/scripts/create-issue.ts --project=ABC --type=Task --summary="My task" --assignee=me
```

**Important - Working with Epics:**

Add **Tasks with parent link** to Epics, not Sub-tasks:
```bash
# Correct - Task with parent link to Epic
npx tsx .claude/skills/jira/scripts/create-issue.ts --project=ABC --type=Task --summary="Implement component" --parent=ABC-100

# Wrong - Sub-task (don't use for Epics)
npx tsx .claude/skills/jira/scripts/create-issue.ts --project=ABC --type=Sub-task --summary="..." --parent=ABC-100
```

Sub-tasks are only for breaking down individual Tasks into smaller parts.

### Updating

#### update-issue.ts
Update an existing issue.
```bash
npx tsx .claude/skills/jira/scripts/update-issue.ts <ISSUE-KEY> [options]
```
Parameters:
- `--summary` - new title
- `--description` - new description (supports multi-line text and wiki markup)
- `--description-file=PATH` - new description from file
- `--description-stdin` - new description from stdin
- `--type` - change issue type (e.g. "Task", "Bug")
- `--priority` - new priority
- `--labels` - new labels (replaces existing)
- `--status` - change status (uses transition)
- `--assignee` - assign to user (email, "me"/"mne" for self, or "none")
- `--link` - link to issue in format "TYPE:KEY"
- `--due` - due date in YYYY-MM-DD format
- `--fix-version` - set fixVersion (replaces existing)
- `--add-fix-version` - add fixVersion (keeps existing)
- `--remove-fix-version` - remove specific fixVersion
- `--affected-version` - set affectedVersion
- `--resolution` - set resolution when changing status (e.g. "Done", "Won't Do")

Examples:
- `npx tsx .claude/skills/jira/scripts/update-issue.ts ABC-123 --status="In Progress"`
- `npx tsx .claude/skills/jira/scripts/update-issue.ts ABC-123 --assignee=me`
- `npx tsx .claude/skills/jira/scripts/update-issue.ts ABC-123 --assignee=jan@company.com`
- `npx tsx .claude/skills/jira/scripts/update-issue.ts ABC-123 --assignee=none`
- `npx tsx .claude/skills/jira/scripts/update-issue.ts ABC-123 --link="Relates:ABC-456"`
- `npx tsx .claude/skills/jira/scripts/update-issue.ts ABC-123 --description-file=./desc.md`
- `echo "Multi-line description" | npx tsx .claude/skills/jira/scripts/update-issue.ts ABC-123 --description-stdin`
- `npx tsx .claude/skills/jira/scripts/update-issue.ts ABC-123 --status="Resolve Issue" --resolution="Done"`

**Note on status changes (--status):**
The parameter expects the **transition** name, not the target status name.
- Names are **case-sensitive**
- Transition names depend on user's language (EN: "Start Progress", CZ: "Zahajit praci")
- Some statuses aren't directly available - you may need intermediate transitions
- Each project may have different transitions

How to find available transitions:
```bash
# Try any value - the script will show available options
npx tsx .claude/skills/jira/scripts/update-issue.ts ABC-123 --status="?"
```

#### unlink-issue.ts
Remove link between issues.
```bash
npx tsx .claude/skills/jira/scripts/unlink-issue.ts <ISSUE-KEY> <TARGET-KEY>
```

#### Web Links (Remote Links)
Add, view, or remove external web links on issues (e.g. preview URLs, PR links).

```bash
# Add a web link
npx tsx .claude/skills/jira/scripts/update-issue.ts ABC-123 --web-link="https://preview.example.com|Preview Environment"

# View web links (shown automatically with get-issue)
npx tsx .claude/skills/jira/scripts/get-issue.ts ABC-123

# Remove a web link by ID (shown in get-issue output)
npx tsx .claude/skills/jira/scripts/update-issue.ts ABC-123 --remove-web-link=12345
```

**Programmatic usage via JiraClient:**
```typescript
const client = JiraClient.forIssue("ABC-123");
await client.addRemoteLink("ABC-123", "https://example.com", "Preview", "Optional summary");
const links = await client.getRemoteLinks("ABC-123");
await client.deleteRemoteLink("ABC-123", "12345");
```

### Board Management

#### move-to-board.ts
Move issue from backlog to board (or vice versa).

```bash
# List available boards
npx tsx .claude/skills/jira/scripts/move-to-board.ts --list-boards

# Move issue to board
npx tsx .claude/skills/jira/scripts/move-to-board.ts <ISSUE-KEY> --board=<BOARD-ID>

# Move issue back to backlog
npx tsx .claude/skills/jira/scripts/move-to-board.ts <ISSUE-KEY> --board=<BOARD-ID> --to-backlog
```

**Tip:** Find Board ID in the board URL: `https://xxx.atlassian.net/jira/software/projects/XXX/boards/5` - the last number (5) is the board ID.

### Moving Between Projects

#### move-issue.ts
Move issue(s) between projects using Bulk Move API.

```bash
npx tsx .claude/skills/jira/scripts/move-issue.ts <ISSUE-KEY> --to-project=<PROJECT-KEY> [options]
```

Parameters:
- `--to-project=KEY` - target project (required)
- `--to-type=NAME` - target issue type (optional)
- `--include-children` - move child issues too
- `--dry-run` - only show what would be moved

### Comments

#### add-comment.ts
Add a comment to an issue. Supports text formatting (see below) or direct ADF JSON.
```bash
npx tsx .claude/skills/jira/scripts/add-comment.ts <ISSUE-KEY> "TEXT"
npx tsx .claude/skills/jira/scripts/add-comment.ts <ISSUE-KEY> --adf='<ADF-JSON>'
```

#### delete-comment.ts
Delete a comment (needs comment ID from get-issue --comments).
```bash
npx tsx .claude/skills/jira/scripts/delete-comment.ts <ISSUE-KEY> <COMMENT-ID>
```

### Attachments

#### upload-attachment.ts
Upload a file as attachment to an issue.
```bash
npx tsx .claude/skills/jira/scripts/upload-attachment.ts <ISSUE-KEY> <FILE-PATH>
```

#### download-attachment.ts
Download an attachment from an issue.
```bash
# List attachments
npx tsx .claude/skills/jira/scripts/download-attachment.ts <ISSUE-KEY> --list

# Download specific attachment
npx tsx .claude/skills/jira/scripts/download-attachment.ts <ISSUE-KEY> <FILENAME> [OUTPUT-PATH]
```

#### delete-attachment.ts
Delete an attachment from an issue.

**WARNING: Irreversible!** Without `--force` the script shows details and requires confirmation.

```bash
# Delete attachment (with confirmation)
npx tsx .claude/skills/jira/scripts/delete-attachment.ts <ISSUE-KEY> <ATTACHMENT-ID>

# Delete without confirmation (for scripts)
npx tsx .claude/skills/jira/scripts/delete-attachment.ts <ISSUE-KEY> <ATTACHMENT-ID> --force

# Delete by filename
npx tsx .claude/skills/jira/scripts/delete-attachment.ts <ISSUE-KEY> --filename=<FILENAME> --force
```

### Users

#### users.ts
Search users and get account IDs (needed for mentions).
```bash
npx tsx .claude/skills/jira/scripts/users.ts <command> [query]
```

Commands:
- `search <QUERY>` - Search users (name, email)
- `me` - Current user info

Examples:
- `npx tsx .claude/skills/jira/scripts/users.ts search "roman"`
- `npx tsx .claude/skills/jira/scripts/users.ts me`

#### list-users.ts
List users from projects.
```bash
npx tsx .claude/skills/jira/scripts/list-users.ts [PROJECT_KEY...]
```
Examples:
- `npx tsx .claude/skills/jira/scripts/list-users.ts DEV OPS` - users from specific projects
- `npx tsx .claude/skills/jira/scripts/list-users.ts` - users from current user's issues

### Sprints

#### list-sprints.ts
List sprints on a board.
```bash
npx tsx .claude/skills/jira/scripts/list-sprints.ts --board=<BOARD-ID> [--state=STATE]
```
Parameters:
- `--state` - filter by state: `active`, `future`, `closed` (default: all)

#### move-to-sprint.ts
Move issues to a sprint.
```bash
npx tsx .claude/skills/jira/scripts/move-to-sprint.ts <ISSUE-KEYS...> --sprint=<SPRINT-ID>
npx tsx .claude/skills/jira/scripts/move-to-sprint.ts <ISSUE-KEYS...> --board=<BOARD-ID>
```

Jira API limit: 50 issues per request. Script auto-batches larger sets.

#### sprint-state.ts
Change sprint state (close/start).
```bash
npx tsx .claude/skills/jira/scripts/sprint-state.ts <SPRINT-ID> --close
npx tsx .claude/skills/jira/scripts/sprint-state.ts <SPRINT-ID> --start --start-date=YYYY-MM-DD --end-date=YYYY-MM-DD
```

**CRITICAL - Move issues before closing:**
Jira API does NOT auto-move incomplete issues (unlike the UI). They'll stay in the closed sprint.

**Required workflow for sprint rotation:**
1. `list-sprints.ts --board=110` - find current and next sprint IDs
2. `move-to-sprint.ts <ISSUES...> --sprint=<NEW-SPRINT-ID>` - move ALL incomplete issues
3. `sprint-state.ts <OLD-SPRINT-ID> --close` - close old sprint
4. `sprint-state.ts <NEW-SPRINT-ID> --start --start-date=... --end-date=...` - activate new sprint

#### trial-status.ts
Get issues in a specific status with the date they transitioned to that status.
```bash
npx tsx .claude/skills/jira/scripts/trial-status.ts --project=KEY --status=STATUS
```

### Versions and Releases

#### list-versions.ts
List project versions.
```bash
npx tsx .claude/skills/jira/scripts/list-versions.ts <PROJECT> [--released] [--unreleased] [--archived] [--json]
```

#### create-version.ts
Create a new version in a project.
```bash
npx tsx .claude/skills/jira/scripts/create-version.ts <PROJECT> --name="v1.0.0" [--description=...] [--release-date=YYYY-MM-DD]
```

#### release-version.ts
Mark a version as released.
```bash
npx tsx .claude/skills/jira/scripts/release-version.ts <PROJECT> <VERSION-NAME> [--date=YYYY-MM-DD]
```

#### update-version.ts
Update an existing version.
```bash
npx tsx .claude/skills/jira/scripts/update-version.ts <PROJECT> <VERSION-NAME> [--name=...] [--description=...] [--archive] [--unarchive]
```

#### Assign version to issue (update-issue.ts)
```bash
npx tsx .claude/skills/jira/scripts/update-issue.ts ABC-123 --fix-version="v2.0.0"
npx tsx .claude/skills/jira/scripts/update-issue.ts ABC-123 --add-fix-version="v2.1.0"
npx tsx .claude/skills/jira/scripts/update-issue.ts ABC-123 --remove-fix-version="v2.0.0"
npx tsx .claude/skills/jira/scripts/update-issue.ts ABC-123 --affected-version="v1.9.0"
```

#### Search issues in version
```bash
npx tsx .claude/skills/jira/scripts/search.ts "project=ABC AND fixVersion='v2.0.0'"
```

## Typical Workflows

### Check task status
```bash
npx tsx .claude/skills/jira/scripts/get-issue.ts ABC-123 --comments
```

### Find open tasks in project
```bash
npx tsx .claude/skills/jira/scripts/search.ts "project = ABC AND status = Open ORDER BY updated DESC"
```

### Create and assign a new task
```bash
npx tsx .claude/skills/jira/scripts/create-issue.ts --project=ABC --type=Task --summary="Implement feature X"
npx tsx .claude/skills/jira/scripts/update-issue.ts ABC-XXX --assignee=jan@company.com
```

### Change task status
```bash
npx tsx .claude/skills/jira/scripts/update-issue.ts ABC-123 --status="In Progress"
# After completion:
npx tsx .claude/skills/jira/scripts/update-issue.ts ABC-123 --status="Close Issue"
```

### Add comment with results
```bash
npx tsx .claude/skills/jira/scripts/add-comment.ts ABC-123 "Implemented in commit abc123. Tests added."
```

### Move issue between projects
```bash
npx tsx .claude/skills/jira/scripts/move-issue.ts OPS-123 --to-project=DEV
npx tsx .claude/skills/jira/scripts/move-issue.ts OPS-123 --to-project=DEV --include-children
```

## Opening Issue in Browser

```bash
open "https://company.atlassian.net/browse/ABC-123"
```

## Text Formatting (comments, description)

Comments and descriptions support formatting that is automatically converted to Jira ADF format.
You can use text formatting or direct ADF JSON (`--adf='...'`).

### Mentions (@user)

To mention a user, first get their account ID:
```bash
npx tsx .claude/skills/jira/scripts/users.ts search "name"
```

Then use ADF JSON:
```bash
npx tsx .claude/skills/jira/scripts/add-comment.ts ABC-123 --adf='{
  "version": 1,
  "type": "doc",
  "content": [
    {"type": "paragraph", "content": [
      {"type": "mention", "attrs": {"id": "ACCOUNT_ID", "text": "@Name"}},
      {"type": "text", "text": " please review"}
    ]}
  ]
}'
```

### Supported Formatting

#### Basic formatting
| Syntax | Result |
|--------|--------|
| `*text*` | **bold** |
| `_text_` | _italic_ |
| `[text\|url]` | link |
| `https://...` | auto link |
| `{{code}}` | `inline code` |

#### Headings
| Syntax | Result |
|--------|--------|
| `h1. Heading` | H1 heading |
| `h2. Heading` | H2 heading |
| `h3. Heading` | H3 heading |

**Note:** Markdown `#` syntax for headings is NOT supported - use Jira style `h1.`, `h2.`, `h3.`

#### Lists
| Syntax | Result |
|--------|--------|
| `- item` | bullet list |
| `* item` | bullet list |
| `# item` | numbered list (Jira wiki markup) |
| `1. item` | numbered list (markdown) |

#### Structures
| Syntax | Result |
|--------|--------|
| `---` | horizontal rule |
| `{quote}text{quote}` | blockquote |
| `\|\|h1\|\|h2\|\|` | table header |
| `\|c1\|c2\|` | table row |

**WARNING - Links in tables:**
Syntax `[text|url]` in tables DOES NOT WORK - the `|` character conflicts with column separators. Solutions:
- Use a list (`* text: url`) instead of a table
- Use plain URL (auto-link): `https://example.com`

#### Blocks
| Syntax | Result |
|--------|--------|
| `{code:typescript}...{code}` | code block with language |
| `{code}...{code}` | code block without language |
| `{panel:title=Title}...{panel}` | panel with title |
| `{panel}...{panel}` | panel without title |

### Example comment with formatting
```bash
npx tsx .claude/skills/jira/scripts/add-comment.ts ABC-123 'h3. Done

- Fixed bug in *module X*
- Added tests

---

h3. Changes

||File||Change||
|main.ts|Refactoring|
|utils.ts|New function|

{code:typescript}
const result = await processData();
{code}

*Please review.*'
```

### Example with direct ADF JSON
```bash
npx tsx .claude/skills/jira/scripts/add-comment.ts ABC-123 --adf='{
  "version": 1,
  "type": "doc",
  "content": [
    {"type": "heading", "attrs": {"level": 3}, "content": [{"type": "text", "text": "Heading"}]},
    {"type": "paragraph", "content": [{"type": "text", "text": "Text with "}, {"type": "text", "text": "bold", "marks": [{"type": "strong"}]}]}
  ]
}'
```

## Notes

- Status changes use Jira transitions - if a status isn't available, the script will show available transitions
- For searching use JQL syntax: https://support.atlassian.com/jira-software-cloud/docs/use-advanced-search-with-jql/
- Issue must be open for uploading attachments
