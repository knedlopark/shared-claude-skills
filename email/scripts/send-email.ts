import nodemailer from "nodemailer";
import { getAccount, parseArgs } from "./config.js";

const args = parseArgs(process.argv.slice(2));

if (!args.account || !args.to || !args.subject) {
  console.error(
    "Usage: npx tsx send-email.ts --account <name> --to <email> --subject <s> [--body <text>] [--from-name <name>]"
  );
  process.exit(1);
}

const account = getAccount(args.account as string);

// Map IMAP host → SMTP host (Gmail-aware default)
const smtpHost = account.host.replace(/^imap\./, "smtp.");
const smtpPort = 465;

const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: true,
  auth: { user: account.user, pass: account.password },
});

const fromName = (args["from-name"] as string) || "";
const from = fromName ? `"${fromName}" <${account.user}>` : account.user;

const info = await transporter.sendMail({
  from,
  to: args.to as string,
  subject: args.subject as string,
  text: (args.body as string) || "",
});

console.log("✓ Sent");
console.log("  Message-ID:", info.messageId);
console.log("  Accepted:  ", info.accepted);
console.log("  Rejected:  ", info.rejected);
console.log("  Response:  ", info.response);
