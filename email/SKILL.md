---
name: email
description: |
  IMAP/SMTP email integration for reading, searching, managing, and sending emails across multiple accounts.
  Supports List-Unsubscribe (RFC 8058 one-click + mailto + HTTP) for automated newsletter unsubscribe.
  This skill should be used when users want to:
  - Read or search emails
  - Check inbox or unread messages
  - Add/remove labels or move emails to folders
  - Get email summaries across accounts
  - List or process newsletter subscriptions (List-Unsubscribe headers)
  - Send emails (including mailto-based unsubscribe requests)
  Auto-invoke for: email, inbox, mail, unread, unsubscribe, IMAP, label, mailbox, newsletter
---

# Email Skill (IMAP + SMTP)

Multi-account IMAP/SMTP email integration using `imapflow`, `mailparser` and `nodemailer`.

## Prerequisites

> ⚠️ **Credentials must be configured.** The skill reads them from the `EMAIL_ACCOUNTS_JSON` environment variable (preferred) or `~/.claude/email-credentials.json` as fallback.

### Configuration

**Preferred — environment variable:**

```bash
export EMAIL_ACCOUNTS_JSON='{"accounts":[{"name":"personal","host":"imap.gmail.com","port":993,"user":"you@gmail.com","password":"app-password","tls":true}]}'
```

**Fallback — file `~/.claude/email-credentials.json`:**

```json
{
  "accounts": [
    {
      "name": "personal",
      "host": "imap.gmail.com",
      "port": 993,
      "user": "you@gmail.com",
      "password": "app-password",
      "tls": true
    },
    {
      "name": "work",
      "host": "imap.example.com",
      "port": 993,
      "user": "you@example.com",
      "password": "...",
      "tls": true
    }
  ]
}
```

### Gmail setup

- Enable IMAP: Settings → Forwarding and POP/IMAP → Enable IMAP
- Create App Password (requires 2FA): Settings → Security → 2-Step Verification → App passwords
- Gmail labels are exposed as IMAP folders (e.g. `[Gmail]/Starred`, `[Gmail]/All Mail`)
- The skill uses `X-GM-LABELS` (Gmail-specific) for native label add/remove

### Install dependencies

```bash
cd <workspace>/skills/shared/email/scripts && npm install
```

## Scripts

All scripts run from `skills/shared/email/scripts/` with `npx tsx <script>.ts`.

### `inbox-summary.ts` — Quick overview of unread emails

```bash
npx tsx inbox-summary.ts                     # All accounts
npx tsx inbox-summary.ts --account personal  # Single account
```

### `search-emails.ts` — Search emails with filters

```bash
npx tsx search-emails.ts --account personal --from "github.com" --unseen --limit 10
npx tsx search-emails.ts --account work --subject "invoice" --since 2026-03-01
npx tsx search-emails.ts --account personal --to "me@example.com" --before 2026-01-01
npx tsx search-emails.ts --account personal --body "keyword" --limit 5
npx tsx search-emails.ts --account personal --folder "INBOX" --unseen
```

Supported filters: `--from`, `--to`, `--subject`, `--body`, `--since YYYY-MM-DD`, `--before YYYY-MM-DD`, `--unseen`, `--seen`, `--flagged`, `--folder <name>`, `--limit <N>`.

### `read-email.ts` — Read a specific email by UID

```bash
npx tsx read-email.ts --account personal --uid 12345
npx tsx read-email.ts --account personal --uid 12345 --mark-read
npx tsx read-email.ts --account personal --uid 12345 --folder "Sent"
npx tsx read-email.ts --account personal --uid 12345 --raw   # raw RFC 5322 source
```

### `list-folders.ts` — List mailbox folders/labels

```bash
npx tsx list-folders.ts --account personal
npx tsx list-folders.ts                       # All accounts
```

### `manage-labels.ts` — Labels, flags, move operations

```bash
npx tsx manage-labels.ts --account personal --uid 12345 --add-label "Finance"
npx tsx manage-labels.ts --account personal --uid 12345 --remove-label "TODO"
npx tsx manage-labels.ts --account personal --uid 12345 --move-to "Archive"
npx tsx manage-labels.ts --account personal --uid 12345 --mark-read
npx tsx manage-labels.ts --account personal --uid 12345 --mark-unread
npx tsx manage-labels.ts --account personal --uid 12345,12346 --add-flag "\\Flagged"
npx tsx manage-labels.ts --account personal --uid 12345 --archive
npx tsx manage-labels.ts --account personal --uid 12345 --delete
```

### `send-email.ts` — Send a plain-text email via SMTP

SMTP host is derived from the IMAP host by replacing `imap.` with `smtp.` (Gmail-compatible default, port 465 TLS).

```bash
npx tsx send-email.ts --account personal --to "someone@example.com" --subject "Hi" --body "Hello"
npx tsx send-email.ts --account personal --to "list-id@example.com" --subject "unsubscribe" --from-name "Your Name"
```

### `unsub-list.ts` — List newsletter senders with `List-Unsubscribe` header

Scans the last N messages in INBOX, groups by sender, and emits a ranked table + JSON. Useful for batch unsubscribe workflows.

```bash
npx tsx unsub-list.ts --account personal --limit 500
```

Output for each sender includes the unsubscribe `method` (`one-click` | `mailto` | `http`) and the `unsubTarget` (URL or `mailto:` URI), so a follow-up script can act on it.

### `unsub-stats.ts` — Distribution of `List-Unsubscribe` methods in INBOX

Aggregate-only view: how many messages have one-click POST, `mailto:` only, HTTP-only links, or no unsubscribe header. Helps decide which automation path is worth building.

```bash
npx tsx unsub-stats.ts --account personal --limit 500
```

### Unsubscribe workflow recipe

1. Run `unsub-stats.ts` to see the distribution.
2. Run `unsub-list.ts` to get the per-sender JSON.
3. For each sender chosen for unsubscribe:
   - `method=one-click` → POST `List-Unsubscribe=One-Click` to the URL (RFC 8058).
   - `method=mailto` → use `send-email.ts` to send an empty message to the `mailto:` target.
   - `method=http` → open the URL in a browser (manual step).
4. Optionally move processed messages with `manage-labels.ts --move-to Archive`.

## Tech

- `imapflow` — IMAP client (supports Gmail `X-GM-LABELS`)
- `mailparser` — RFC 5322 parsing for `read-email.ts`
- `nodemailer` — SMTP client for `send-email.ts`

## Notes

- Credentials are loaded by `config.ts` once per process. The env var takes precedence over the file.
- All scripts use UID-based addressing (`{ uid: true }`) — UIDs are stable across sessions, sequence numbers are not.
- Connections are properly closed (`client.logout()`) on both success and failure paths.
