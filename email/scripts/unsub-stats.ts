import { ImapFlow } from "imapflow";
import { getAccount, parseArgs } from "./config.js";

const args = parseArgs(process.argv.slice(2));

if (!args.account) {
  console.error("Usage: npx tsx unsub-stats.ts --account <name> [--limit 500]");
  process.exit(1);
}

const account = getAccount(args.account as string);
const limit = parseInt(args.limit as string) || 500;

const client = new ImapFlow({
  host: account.host, port: account.port, secure: account.tls,
  auth: { user: account.user, pass: account.password }, logger: false,
});

await client.connect();
const lock = await client.getMailboxLock("INBOX");

let total = 0, withUnsub = 0, oneClick = 0, mailto = 0, httpOnly = 0;
const senderStats: Record<string, { total: number; unsub: number }> = {};

try {
  const status = await client.status("INBOX", { messages: true });
  const totalMsgs = status.messages || 0;
  const startSeq = Math.max(1, totalMsgs - limit + 1);
  const range = `${startSeq}:*`;

  for await (const msg of client.fetch(range, { envelope: true, headers: ["list-unsubscribe", "list-unsubscribe-post", "from"] })) {
    total++;
    const headerStr = msg.headers?.toString() || "";
    const fromAddr: any = msg.envelope?.from?.[0];
    let sender = "unknown";
    if (fromAddr) {
      if (fromAddr.address) sender = String(fromAddr.address).toLowerCase();
      else if (fromAddr.mailbox && fromAddr.host) sender = `${fromAddr.mailbox}@${fromAddr.host}`.toLowerCase();
    }
    if (sender === "unknown" || sender === "undefined@undefined") {
      const m = headerStr.match(/^From:\s*(.+)$/mi);
      if (m) {
        const em = m[1].match(/<([^>]+)>/) || m[1].match(/([^\s<>]+@[^\s<>]+)/);
        if (em) sender = em[1].toLowerCase();
      }
    }
    senderStats[sender] = senderStats[sender] || { total: 0, unsub: 0 };
    senderStats[sender].total++;

    const lu = headerStr.match(/^List-Unsubscribe:\s*(.+(?:\r?\n[ \t]+.+)*)/im);
    if (!lu) continue;
    withUnsub++;
    senderStats[sender].unsub++;

    const luVal = lu[1].replace(/\r?\n[ \t]+/g, " ");
    const hasMailto = /mailto:/i.test(luVal);
    const hasHttp = /https?:/i.test(luVal);
    const hasOneClick = /^List-Unsubscribe-Post:.*One-Click/im.test(headerStr);

    if (hasOneClick) oneClick++;
    else if (hasMailto) mailto++;
    else if (hasHttp) httpOnly++;
  }
} finally {
  lock.release();
  await client.logout();
}

const pct = (n: number) => total ? `${((n/total)*100).toFixed(1)}%` : "0%";
console.log(`\n=== ${account.name} — last ${total} INBOX messages ===`);
console.log(`  With List-Unsubscribe: ${withUnsub} (${pct(withUnsub)})`);
console.log(`    One-Click POST:      ${oneClick} (${pct(oneClick)})  ← automatable`);
console.log(`    mailto only/with:    ${mailto} (${pct(mailto)})  ← requires SMTP send`);
console.log(`    http link only:      ${httpOnly} (${pct(httpOnly)})  ← web form / GET`);
console.log(`  No header:             ${total-withUnsub} (${pct(total-withUnsub)})\n`);

const top = Object.entries(senderStats)
  .filter(([_, s]) => s.unsub > 0)
  .sort((a, b) => b[1].total - a[1].total)
  .slice(0, 15);
console.log(`Top 15 senders with List-Unsubscribe (unsubscribe candidates):`);
for (const [s, st] of top) console.log(`  ${st.total.toString().padStart(3)}× ${s}`);
