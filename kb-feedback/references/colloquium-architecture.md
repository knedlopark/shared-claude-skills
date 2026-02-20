# Colloquium Architecture

## Why 4 Agents?

Each agent covers a different quality dimension — together they eliminate blind spots:

| Agent | Dimension | Catches |
|-------|-----------|---------|
| PRAGMA | Factual accuracy | Wrong info, broken references, contradictions |
| STRATOS | Structure | Misplaced content, missing cross-refs, bloat |
| PRAXIS | User impact | Low-value additions, wrong root cause |
| CUSTOS | Quality standards | Duplicates, style violations, edge cases |

## Model Selection

- **Review agents (4×):** Use default model or explicitly fast model — they do focused analysis
- **Consolidator:** Use the main session agent — needs judgment for synthesis
- Sub-agents run via `sessions_spawn` which handles model selection

## Scaling

For small feedback (1-3 items): All 4 agents still run — overhead is minimal and catches are valuable.

For large feedback (10+ items): Consider batching into groups of 5-7 items per colloquium run.

## Without sessions_spawn

If `sessions_spawn` is not available, run the 4 reviews sequentially in the main session. Less parallel but same quality. Use the same prompts, just inline.

## Integration with Version Control

After applying approved changes:
1. Stage changed files
2. Commit with reference: `kb: [{TAG}] {description} [feedback-{timestamp}]`
3. Push if remote is configured

This creates an audit trail linking KB changes back to the feedback that triggered them.
