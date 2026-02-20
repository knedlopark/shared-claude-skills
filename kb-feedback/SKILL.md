---
name: kb-feedback
description: Multi-agent feedback loop for knowledge base maintenance. Use when a user says "feedback", "what did we learn", "review KB", "update knowledge base", or wants to review a session for insights and apply them to the KB with quality control. Provides a colloquium-style review with 4 specialized agents before any KB changes are made.
---

# KB Feedback Loop

A structured workflow for extracting insights from sessions and applying them to the knowledge base with multi-agent quality review.

## Overview

1. **Extract** — Analyze conversation, identify insights
2. **Review** — 4 parallel agents evaluate each insight (colloquium)
3. **Consolidate** — Synthesize verdicts into a report
4. **Apply** — Implement approved changes with user confirmation

## Step 1: Extract Feedback

Scan the current session (or specified session via `sessions_history`). For each insight, assign a tag:

| Tag | Meaning |
|-----|---------|
| `[BUG]` | Error caused by wrong KB info |
| `[MISSING]` | Missing documentation |
| `[UNCLEAR]` | Ambiguous or misleading info |
| `[WRONG]` | Factually incorrect info |
| `[EXAMPLE]` | Missing or bad example |
| `[FLOW]` | Workflow problem |
| `[OBSOLETE]` | Outdated information |

Present numbered list to user. User selects which to include ("all", numbers, or custom text).

Save selected feedback to `memory/feedback/feedback-{YYYY-MM-DD-HHmmss}.md`:

```markdown
# Feedback {timestamp}
## Source: {session description}
## Items
### 1. [{TAG}] {title}
- **File:** {path to affected KB file}
- **Section:** {specific section/lines}
- **Problem:** {description}
- **Impact:** {who is affected, how often}
- **Proposed fix:** {concrete change}
```

## Step 2: Colloquium (Multi-Agent Review)

Spawn 4 parallel sub-agents via `sessions_spawn`. Each receives the feedback file content and relevant KB file contents as context.

### Agent prompts

Use these task descriptions for each agent. Replace `{FEEDBACK_CONTENT}` with the actual feedback file content, and `{KB_FILES}` with contents of affected KB files.

#### PRAGMA — Factual Accuracy

```
You are PRAGMA, a factual accuracy reviewer. Verify each feedback item:
- Do referenced files/sections/functions actually exist?
- Are proposed changes factually correct?
- Are there duplicates with existing KB content?
- Would the change introduce contradictions?

For each item, output:
## Item {N}: {title}
- **Verified:** ✓/✗
- **Evidence:** {file:line references or explanation}
- **Issues:** {any problems found}
- **Recommendation:** ACCEPT / REVISE / REJECT

Context:
{FEEDBACK_CONTENT}

Relevant KB files:
{KB_FILES}
```

#### STRATOS — KB Architecture

```
You are STRATOS, a knowledge base architect. For each feedback item, determine:
- Where does this change belong? (which file, which section)
- Should it extend existing content or create new?
- Are there cross-reference opportunities?
- Does it fit the existing structure and size guidelines?

For each item, output:
## Item {N}: {title}
- **Location:** {recommended file and section}
- **Action:** EXTEND / NEW_SECTION / NEW_FILE / CROSS_REF
- **Structure notes:** {sizing, organization recommendations}
- **Recommendation:** ACCEPT / REVISE / REJECT

Context:
{FEEDBACK_CONTENT}

Relevant KB files:
{KB_FILES}
```

#### PRAXIS — User Impact

```
You are PRAXIS, a user impact analyst. For each feedback item, assess:
- Who benefits? (whole team, specific role, one person)
- How often does this come up? (daily/weekly/monthly/once)
- Is the root cause a docs problem or a tooling problem?
- Is it clear enough for new team members?

For each item, output:
## Item {N}: {title}
- **Audience:** {who benefits}
- **Frequency:** {how often relevant}
- **Root cause:** DOCS / TOOLING / PROCESS
- **Recommendation:** ACCEPT / REVISE / REJECT

Context:
{FEEDBACK_CONTENT}

Relevant KB files:
{KB_FILES}
```

#### CUSTOS — Quality Gate

```
You are CUSTOS, a quality gatekeeper. Check each feedback item against:
1. Useful to more than one person?
2. Repeatable (not one-off)?
3. Not a duplicate?
4. Correct location?
5. Concise (under ~30 lines)?
6. Not deprecated/obsolete?
7. Generic (not overly specific)?
8. Consistent with surrounding style?

For each item, output:
## Item {N}: {title}
- **Checklist:** {pass/fail per criterion}
- **Score:** {N}/8
- **Issues:** {any failures}
- **Recommendation:** ACCEPT / REVISE / REJECT

Context:
{FEEDBACK_CONTENT}

Relevant KB files:
{KB_FILES}
```

### Spawning

```
sessions_spawn × 4 (parallel, no dependencies):
  label: "feedback-pragma-{timestamp}"
  task: {PRAGMA prompt with filled context}

  label: "feedback-stratos-{timestamp}"
  task: {STRATOS prompt with filled context}

  label: "feedback-praxis-{timestamp}"
  task: {PRAXIS prompt with filled context}

  label: "feedback-custos-{timestamp}"
  task: {CUSTOS prompt with filled context}
```

Wait for all 4 to complete (check via `sessions_list`).

## Step 3: Consolidate

Collect outputs from all 4 agents. Build a verdict for each item:

| Verdict | Condition |
|---------|-----------|
| ✅ **IMPLEMENT** | 4/4 or 3/4 ACCEPT (minor revisions ok) |
| 🔄 **REVISE** | Majority ACCEPT but needs changes |
| 🟠 **DISCUSS** | Agents disagree — user decides |
| ❌ **REJECT** | Majority REJECT or critical issue |

Generate consolidated report — save to `memory/feedback/report-{timestamp}.md` and present to user:

```markdown
# Colloquium Report — {date}

| # | Item | PRAGMA | STRATOS | PRAXIS | CUSTOS | VERDICT |
|---|------|--------|---------|--------|--------|---------|
| 1 | [{TAG}] desc | ✓ | ✓ | ✓ | ✓ | ✅ IMPLEMENT |

## Auto-approved (✅)
{details}

## Needs revision (🔄)
{details + what to change}

## Needs discussion (🟠)
{conflicting views + options}

## Rejected (❌)
{reasons}
```

## Step 4: Apply Changes

For each approved item:
1. Show the proposed diff (before/after)
2. Wait for explicit user approval
3. Apply the change
4. Commit with message: `kb: {tag} {description} [feedback-{timestamp}]`

**Never auto-apply changes.** Even ✅ IMPLEMENT items require user confirmation.

## Protected Files

By default, these files require the feedback workflow for changes:
- `MEMORY.md`
- `SOUL.md`
- `AGENTS.md`
- `skills/` (skill definitions)

Freely editable (operational data):
- `memory/daily/`
- `memory/business/`
- `memory/feedback/`
- `HEARTBEAT.md`
- `TOOLS.md`

Adjust these lists per project by noting overrides in AGENTS.md or MEMORY.md.

## Decision Tree

```
Insight from session
│
├── Is it about the KB / product / workflow?
│   ├── NO → skip
│   └── YES
│       ├── Already documented?
│       │   ├── YES → skip or CONSOLIDATE
│       │   └── NO
│       │       ├── Repeatable pattern?
│       │       │   ├── NO → skip (edge case)
│       │       │   └── YES → include in feedback
```

## Triggering

Activate this skill when:
- User says "feedback", "co jsme se naučili", "review KB", "update knowledge base"
- End of a productive session with new insights
- User explicitly asks to review and improve documentation
