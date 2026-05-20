import { ImapFlow } from "imapflow";
import { getAccount, parseArgs } from "./config.js";

const args = parseArgs(process.argv.slice(2));

if (!args.account) {
  console.error("Usage: npx tsx unsub-list.ts --account <name> [--limit 500]");
  process.exit(1);
}

const account = getAccount(args.account as string);
const limit = parseInt(args.limit as string) || 500;

interface SenderInfo {
  count: number;
  lastDate: string;
  lastUid: number;
  lastSubject: string;
  method: "one-click" | "mailto" | "http";
  unsubTarget: string;
}

const client = new ImapFlow({
  host: account.host, port: account.port, secure: account.tls,
  auth: { user: account.user, pass: account.password }, logger: false,
});
await client.connect();
const lock = await client.getMailboxLock("INBOX");

const senders: Record<string, SenderInfo> = {};

try {
  const status = await client.status("INBOX", { messages: true });
  const totalMsgs = status.messages || 0;
  const startSeq = Math.max(1, totalMsgs - limit + 1);

  for await (const msg of client.fetch(`${startSeq}:*`, { envelope: true, uid: true, headers: ["list-unsubscribe", "list-unsubscribe-post", "from"] })) {
    const headerStr = msg.headers?.toString() || "";
    const lu = headerStr.match(/^List-Unsubscribe:\s*(.+(?:\r?\n[ \t]+.+)*)/im);
    if (!lu) continue;

    const fromAddr: any = msg.envelope?.from?.[0];
    let sender = "unknown";
    if (fromAddr?.address) sender = String(fromAddr.address).toLowerCase();
    else if (fromAddr?.mailbox && fromAddr?.host) sender = `${fromAddr.mailbox}@${fromAddr.host}`.toLowerCase();
    if (sender === "unknown" || sender === "undefined@undefined") {
      const m = headerStr.match(/^From:\s*(.+)$/mi);
      const em = m?.[1]?.match(/<([^>]+)>/) || m?.[1]?.match(/([^\s<>]+@[^\s<>]+)/);
      if (em) sender = em[1].toLowerCase();
    }

    const luVal = lu[1].replace(/\r?\n[ \t]+/g, " ").trim();
    const hasOneClick = /^List-Unsubscribe-Post:.*One-Click/im.test(headerStr);
    const httpMatch = luVal.match(/<(https?:\/\/[^>]+)>/i);
    const mailtoMatch = luVal.match(/<(mailto:[^>]+)>/i);

    let method: "one-click" | "mailto" | "http";
    let target: string;
    if (hasOneClick && httpMatch) { method = "one-click"; target = httpMatch[1]; }
    else if (mailtoMatch) { method = "mailto"; target = mailtoMatch[1]; }
    else if (httpMatch) { method = "http"; target = httpMatch[1]; }
    else continue;

    const date = msg.envelope?.date?.toISOString().slice(0, 10) || "";
    const subject = msg.envelope?.subject || "";

    if (!senders[sender]) {
      senders[sender] = { count: 0, lastDate: date, lastUid: msg.uid!, lastSubject: subject, method, unsubTarget: target };
    }
    senders[sender].count++;
    if (date > senders[sender].lastDate) {
      senders[sender].lastDate = date;
      senders[sender].lastUid = msg.uid!;
      senders[sender].lastSubject = subject;
      senders[sender].method = method;
      senders[sender].unsubTarget = target;
    }
  }
} finally {
  lock.release();
  await client.logout();
}

const list = Object.entries(senders).sort((a, b) => b[1].count - a[1].count);
console.log(`\n=== ${account.name} — ${list.length} senders with List-Unsubscribe (last ${limit} in INBOX) ===\n`);
console.log(`# | count | last date | method    | sender                                        | last subject`);
console.log(`-`.repeat(130));
list.forEach(([s, info], i) => {
  const m = info.method.padEnd(9);
  const subj = info.lastSubject.slice(0, 50);
  console.log(`${String(i+1).padStart(2)} | ${String(info.count).padStart(5)} | ${info.lastDate} | ${m} | ${s.padEnd(45)} | ${subj}`);
});
console.log();
// Emit JSON for scripting
console.log("---JSON---");
console.log(JSON.stringify(list.map(([sender, info], i) => ({ idx: i+1, sender, ...info })), null, 2));
