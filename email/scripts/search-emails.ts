import { ImapFlow } from "imapflow";
import { getAccount, parseArgs } from "./config.js";

const args = parseArgs(process.argv.slice(2));

if (!args.account) {
  console.error("Usage: npx tsx search-emails.ts --account <name> [--from X] [--to X] [--subject X] [--body X] [--since YYYY-MM-DD] [--before YYYY-MM-DD] [--unseen] [--folder INBOX] [--limit 20]");
  process.exit(1);
}

const account = getAccount(args.account as string);
const folder = (args.folder as string) || "INBOX";
const limit = parseInt(args.limit as string) || 20;

// Build IMAP search query
const query: Record<string, any> = {};
if (args.from) query.from = args.from as string;
if (args.to) query.to = args.to as string;
if (args.subject) query.subject = args.subject as string;
if (args.body) query.body = args.body as string;
if (args.since) query.since = new Date(args.since as string);
if (args.before) query.before = new Date(args.before as string);
if (args.unseen) query.seen = false;
if (args.seen) query.seen = true;
if (args.flagged) query.flagged = true;

const client = new ImapFlow({
  host: account.host,
  port: account.port,
  secure: account.tls,
  auth: { user: account.user, pass: account.password },
  logger: false,
});

await client.connect();

try {
  const lock = await client.getMailboxLock(folder);
  try {
    const uids = await client.search(query, { uid: true });

    if (uids.length === 0) {
      console.log("No emails found matching criteria.");
      process.exit(0);
    }

    // Take latest N
    const selectedUids = uids.slice(-limit).reverse();

    console.log(`Found ${uids.length} emails (showing ${selectedUids.length}):\n`);

    for await (const msg of client.fetch(selectedUids, { envelope: true, flags: true, uid: true, headers: true }, { uid: true })) {
      const from = msg.envelope.from?.[0];
      const email = from?.mailbox && from?.host ? `${from.mailbox}@${from.host}` : null;
      let fromStr = from?.name ? (email ? `${from.name} <${email}>` : from.name) : (email || null);
      if (!fromStr && msg.headers) {
        // Fallback: parse raw From header for emails with broken envelope
        const headerStr = msg.headers.toString();
        const fromMatch = headerStr.match(/^From:\s*(.+)$/mi);
        fromStr = fromMatch?.[1]?.trim() || "unknown";
      }
      fromStr = fromStr || "unknown";
      const date = msg.envelope.date?.toISOString().slice(0, 16).replace("T", " ") || "";
      const flags = msg.flags?.size ? ` [${[...msg.flags].join(", ")}]` : "";
      const seen = msg.flags?.has("\\Seen") ? " " : "●";

      console.log(`${seen} UID ${msg.uid} | ${date} | ${fromStr}${flags}`);
      console.log(`  ${msg.envelope.subject || "(no subject)"}`);
    }
  } finally {
    lock.release();
  }
} finally {
  await client.logout();
}
