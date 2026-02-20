---
name: kb-feedback
description: Multi-agent feedback loop for knowledge base maintenance. Use when a user says "feedback", "what did we learn", "review KB", "update knowledge base", "extract feedback", or wants to review a session/thread for insights and apply them to the KB with quality control. Also activates on continuous insight logging during normal work. Provides a colloquium-style review with 4 specialized agents before any KB changes are made.
---

# KB Feedback Loop

Three modes for maintaining KB quality:

1. **Continuous** — Agent logs insights to an inbox during normal work
2. **Session Feedback** — Interactive extraction of insights from current conversation
3. **Retrospective** — Batch review of accumulated insights via multi-agent colloquium

## Mode 1: Continuous Logging

During any session, when the agent encounters something noteworthy, append a line to `memory/feedback/inbox.md`:

```markdown
- [{TAG}] {description} — source: {session/channel/context} @ {ISO timestamp}
```

**Do not interrupt the user.** Just append and continue working. The inbox is append-only during normal work.

### Tags

#### Knowledge
| Tag | When to use |
|-----|-------------|
| `[LESSON]` | Learned something the hard way (trial & error cost time) |
| `[WRONG]` | KB contains incorrect information |
| `[MISSING]` | Needed info that doesn't exist in KB |
| `[OBSOLETE]` | KB info is outdated |

#### Process
| Tag | When to use |
|-----|-------------|
| `[FLOW]` | Workflow is inefficient or broken |
| `[SHORTCUT]` | Discovered a faster/better way |
| `[PATTERN]` | Recurring task that should be templated |

#### Communication
| Tag | When to use |
|-----|-------------|
| `[UNCLEAR]` | Ambiguity that needs team clarification |
| `[TERMINOLOGY]` | Inconsistent naming across KB |
| `[CONTEXT]` | Learned about a user/team member's preferences or habits |

#### Technical
| Tag | When to use |
|-----|-------------|
| `[BUG]` | Error caused by wrong KB/docs |
| `[TOOLING]` | Tool limitation or missing capability |
| `[DEPENDENCY]` | Missing dependency or environment issue |

### Inbox format

Create `memory/feedback/inbox.md` if it doesn't exist:

```markdown
# Feedback Inbox
Items logged continuously. Processed during retrospectives.

## Pending
- [LESSON] Raynet task API requires `owner` field — not documented — source: #ai-test @ 2026-02-20T14:30:00Z
- [MISSING] No onboarding procedure for CRM setup — source: DM/martin @ 2026-02-20T15:00:00Z

## Processed
<!-- Items moved here after retrospective with reference to report -->
```

### When to log

Log when you:
- Hit an error caused by KB gaps
- Discover something not in KB that should be
- Notice inconsistency between KB and reality
- Find a better way to do something
- Learn user preferences not yet documented
- Encounter terminology confusion

### When NOT to log

- Trivial or one-off issues
- Things already in the inbox
- Personal session artifacts (debug output, temp files)

## Mode 2: Session Feedback (Interactive)

Trigger: user says "feedback", "co jsme se naučili", "extract feedback", "what did we learn here"

### Step 1: Analyze conversation

Read the current thread/session. If in a Slack thread, read the full thread via `message read` with `threadId`. If in a session, review recent conversation history.

Identify every potential insight. Tag each one using the standard tags (see Continuous mode above).

### Step 2: Present to user

Show numbered list with tags:

```
Found {N} potential insights from this conversation:

1. [LESSON] {description}
2. [MISSING] {description}
3. [TERMINOLOGY] {description}
...

Which ones to keep? (numbers, "all", or type your own)
```

### Step 3: User selects

User responds with:
- Numbers: `1, 3, 5` — keep only those
- `all` — keep everything
- Custom text — add as-is with appropriate tag

### Step 4: Disposition

Ask user:
- **"inbox"** (default) — Append selected items to `memory/feedback/inbox.md` for later retrospective
- **"review now"** — Save as feedback file and immediately run colloquium (Mode 3)

If user doesn't specify, default to inbox.

---

## Mode 3: Retrospective (Colloquium)

Trigger: user says "feedback", "review inbox", "what did we learn", "retrospective", "process feedback"

### Step 1: Prepare

Read `memory/feedback/inbox.md`. If empty, scan recent sessions via `sessions_history` for insights.

Group items by target KB file/topic. Present summary to user:

```
Found {N} items in inbox:
- {count} Knowledge ({LESSON}, {WRONG}, {MISSING}, {OBSOLETE})
- {count} Process ({FLOW}, {SHORTCUT}, {PATTERN})
- {count} Communication ({UNCLEAR}, {TERMINOLOGY}, {CONTEXT})
- {count} Technical ({BUG}, {TOOLING}, {DEPENDENCY})

Process all, or select specific items/categories?
```

User selects scope. Save structured feedback to `memory/feedback/feedback-{timestamp}.md`:

```markdown
# Feedback {timestamp}
## Items
### 1. [{TAG}] {title}
- **File:** {path to affected KB file}
- **Section:** {specific section/lines if known}
- **Problem:** {description}
- **Impact:** {who is affected, how often}
- **Proposed fix:** {concrete change}
```

### Step 2: Colloquium (Multi-Agent Review)

Spawn 4 parallel sub-agents via `sessions_spawn`. Each receives the feedback file content and relevant KB file contents.

Read `references/agent-prompts.md` for the full prompt templates for each agent.

The 4 agents:

| Agent | Dimension | Catches |
|-------|-----------|---------|
| **PRAGMA** | Factual accuracy | Wrong info, broken refs, contradictions |
| **STRATOS** | KB architecture | Misplaced content, missing cross-refs, bloat |
| **PRAXIS** | User impact | Low-value additions, wrong root cause |
| **CUSTOS** | Quality standards | Duplicates, style violations, edge cases |

Spawn all 4 in parallel (no dependencies between them):

```
sessions_spawn × 4:
  label: "feedback-pragma-{timestamp}"
  label: "feedback-stratos-{timestamp}"
  label: "feedback-praxis-{timestamp}"
  label: "feedback-custos-{timestamp}"
```

Wait for all 4 to complete (poll via `sessions_list`).

### Step 3: Consolidate

Collect outputs. Build verdict per item:

| Verdict | Condition |
|---------|-----------|
| ✅ **IMPLEMENT** | 4/4 or 3/4 ACCEPT |
| 🔄 **REVISE** | Majority ACCEPT but needs changes |
| 🟠 **DISCUSS** | Agents disagree — user decides |
| ❌ **REJECT** | Majority REJECT or critical issue |

Save report to `memory/feedback/report-{timestamp}.md` and present to user:

```markdown
# Colloquium Report — {date}

| # | Item | PRAGMA | STRATOS | PRAXIS | CUSTOS | VERDICT |
|---|------|--------|---------|--------|--------|---------|
| 1 | [{TAG}] desc | ✓ | ✓ | ✓ | ✓ | ✅ IMPLEMENT |

## Auto-approved (✅)
## Needs revision (🔄)
## Needs discussion (🟠)
## Rejected (❌)
```

### Step 4: Apply

For each approved item:
1. Show proposed diff (before/after)
2. Wait for explicit user approval
3. Apply change
4. Commit: `kb: [{TAG}] {description} [feedback-{timestamp}]`

Move processed items from `## Pending` to `## Processed` in inbox.md with report reference.

**Never auto-apply.** Even ✅ items need user confirmation.

## Decision Tree

```
Insight during work
│
├── Worth noting?
│   ├── NO → continue
│   └── YES → append to inbox.md
│
During retrospective:
│
├── Already in KB?
│   ├── YES + correct → skip
│   ├── YES + wrong → [WRONG]
│   └── NO
│       ├── Repeatable?
│       │   ├── NO → skip (edge case)
│       │   └── YES → include
```

## Configuration

Projects can customize by adding to their AGENTS.md or MEMORY.md:

- **Protected files** — which files require colloquium (default: main KB files, skills)
- **Free files** — which files are freely editable (default: daily notes, operational data)
- **Extra tags** — domain-specific categories (e.g. `[FEATURE]`, `[COMPETITOR]`)
- **Retrospective schedule** — manual, weekly cron, or per-session
