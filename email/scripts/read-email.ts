import { ImapFlow } from "imapflow";
import { getAccount, parseArgs } from "./config.js";
import { simpleParser } from "mailparser";

const args = parseArgs(process.argv.slice(2));

if (!args.account || !args.uid) {
  console.error("Usage: npx tsx read-email.ts --account <name> --uid <uid> [--folder INBOX] [--mark-read] [--raw]");
  process.exit(1);
}

const account = getAccount(args.account as string);
const folder = (args.folder as string) || "INBOX";
const uid = parseInt(args.uid as string);

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
    // Fetch the message source
    const msg = await client.fetchOne(uid, { source: true, envelope: true, flags: true }, { uid: true });

    if (!msg) {
      console.error(`Email UID ${uid} not found in ${folder}`);
      process.exit(1);
    }

    if (args.raw) {
      // Output raw source
      console.log(msg.source.toString());
    } else {
      // Parse and display nicely
      const parsed = await simpleParser(msg.source);

      console.log(`From: ${parsed.from?.text || "unknown"}`);
      console.log(`To: ${parsed.to?.text || "unknown"}`);
      if (parsed.cc) console.log(`Cc: ${parsed.cc.text}`);
      console.log(`Date: ${parsed.date?.toISOString() || "unknown"}`);
      console.log(`Subject: ${parsed.subject || "(no subject)"}`);
      const flags = msg.flags?.size ? [...msg.flags].join(", ") : "none";
      console.log(`Flags: ${flags}`);

      if (parsed.attachments?.length) {
        console.log(`Attachments: ${parsed.attachments.map((a) => `${a.filename || "unnamed"} (${a.contentType})`).join(", ")}`);
      }

      console.log("\n" + "─".repeat(60) + "\n");

      // Prefer text, fallback to stripped HTML
      if (parsed.text) {
        console.log(parsed.text);
      } else if (parsed.html) {
        // Basic HTML stripping
        const text = parsed.html
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
          .replace(/<[^>]+>/g, "")
          .replace(/&nbsp;/g, " ")
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/\n{3,}/g, "\n\n")
          .trim();
        console.log(text);
      }
    }

    // Mark as read if requested
    if (args["mark-read"]) {
      await client.messageFlagsAdd(uid, ["\\Seen"], { uid: true });
      console.log("\n✓ Marked as read");
    }
  } finally {
    lock.release();
  }
} finally {
  await client.logout();
}
