import { ImapFlow } from "imapflow";
import { getAccount, getAllAccounts, parseArgs, type AccountConfig } from "./config.js";

async function inboxSummary(account: AccountConfig) {
  const client = new ImapFlow({
    host: account.host,
    port: account.port,
    secure: account.tls,
    auth: { user: account.user, pass: account.password },
    logger: false,
  });

  await client.connect();

  try {
    console.log(`\n📬 ${account.name} (${account.user})`);
    console.log("─".repeat(50));

    // Get folder list and check key folders
    const folders = await client.list();
    const checkFolders = ["INBOX"];

    // Add special folders if they exist
    for (const f of folders) {
      if (f.specialUse === "\\Sent" || f.specialUse === "\\Drafts" || f.specialUse === "\\Junk") {
        checkFolders.push(f.path);
      }
    }

    for (const folderPath of checkFolders) {
      try {
        const status = await client.status(folderPath, { messages: true, unseen: true });
        const unseenTag = status.unseen ? ` (${status.unseen} unread)` : "";
        console.log(`  ${folderPath}: ${status.messages} messages${unseenTag}`);
      } catch {
        // folder might not exist
      }
    }

    // Show latest unread emails from INBOX
    const lock = await client.getMailboxLock("INBOX");
    try {
      const unseenSeq = await client.search({ seen: false }, { uid: true });
      if (unseenSeq.length > 0) {
        const latestUids = unseenSeq.slice(-5).reverse();
        console.log(`\n  Latest unread:`);
        for await (const msg of client.fetch(latestUids, { envelope: true, uid: true }, { uid: true })) {
          const from = msg.envelope.from?.[0];
          const email = from?.mailbox && from?.host ? `${from.mailbox}@${from.host}` : null;
          const fromStr = from?.name ? (email ? `${from.name} <${email}>` : from.name) : (email || "unknown");
          const date = msg.envelope.date?.toISOString().slice(0, 16).replace("T", " ") || "";
          console.log(`    UID ${msg.uid} | ${date} | ${fromStr}`);
          console.log(`      ${msg.envelope.subject || "(no subject)"}`);
        }
      } else {
        console.log(`\n  ✓ No unread emails`);
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const args = parseArgs(process.argv.slice(2));

if (args.account) {
  await inboxSummary(getAccount(args.account as string));
} else {
  for (const account of getAllAccounts()) {
    await inboxSummary(account);
  }
}
