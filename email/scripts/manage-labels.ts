import { ImapFlow } from "imapflow";
import { getAccount, parseArgs } from "./config.js";

const args = parseArgs(process.argv.slice(2));

if (!args.account || !args.uid) {
  console.error(
    "Usage: npx tsx manage-labels.ts --account <name> --uid <uid1,uid2,...> [options]\n\n" +
    "Options:\n" +
    "  --folder INBOX       Source folder (default: INBOX)\n" +
    "  --mark-read          Add \\Seen flag\n" +
    "  --mark-unread        Remove \\Seen flag\n" +
    "  --add-flag <flag>    Add IMAP flag (e.g. \\Flagged, \\Answered)\n" +
    "  --remove-flag <flag> Remove IMAP flag\n" +
    "  --add-label <label>  Add Gmail label (X-GM-LABELS)\n" +
    "  --remove-label <l>   Remove Gmail label\n" +
    "  --move-to <folder>   Move message to folder\n" +
    "  --archive            Archive (remove from INBOX, keep in All Mail)\n" +
    "  --delete             Move to Trash"
  );
  process.exit(1);
}

const account = getAccount(args.account as string);
const folder = (args.folder as string) || "INBOX";
const uidList = (args.uid as string).split(",").map((u) => parseInt(u.trim()));

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
    for (const uid of uidList) {
      console.log(`Processing UID ${uid}...`);

      if (args["mark-read"]) {
        await client.messageFlagsAdd(uid, ["\\Seen"], { uid: true });
        console.log(`  ✓ Marked as read`);
      }

      if (args["mark-unread"]) {
        await client.messageFlagsRemove(uid, ["\\Seen"], { uid: true });
        console.log(`  ✓ Marked as unread`);
      }

      if (args["add-flag"]) {
        await client.messageFlagsAdd(uid, [args["add-flag"] as string], { uid: true });
        console.log(`  ✓ Added flag: ${args["add-flag"]}`);
      }

      if (args["remove-flag"]) {
        await client.messageFlagsRemove(uid, [args["remove-flag"] as string], { uid: true });
        console.log(`  ✓ Removed flag: ${args["remove-flag"]}`);
      }

      // Gmail label operations (X-GM-LABELS)
      if (args["add-label"]) {
        try {
          await client.messageFlagsAdd(uid, [args["add-label"] as string], { uid: true, useLabels: true });
          console.log(`  ✓ Added label: ${args["add-label"]}`);
        } catch (err: any) {
          console.error(`  ✗ Failed to add label (server may not support X-GM-LABELS): ${err.message}`);
        }
      }

      if (args["remove-label"]) {
        try {
          await client.messageFlagsRemove(uid, [args["remove-label"] as string], { uid: true, useLabels: true });
          console.log(`  ✓ Removed label: ${args["remove-label"]}`);
        } catch (err: any) {
          console.error(`  ✗ Failed to remove label (server may not support X-GM-LABELS): ${err.message}`);
        }
      }

      if (args["move-to"]) {
        await client.messageMove(uid, args["move-to"] as string, { uid: true });
        console.log(`  ✓ Moved to: ${args["move-to"]}`);
      }

      if (args.archive) {
        // Gmail archive = delete from INBOX (removes INBOX label, stays in All Mail)
        await client.messageDelete(uid, { uid: true });
        console.log(`  ✓ Archived`);
      }

      if (args.delete) {
        // Try common trash folder names
        const trashNames = ["[Gmail]/Trash", "Trash"];
        let moved = false;
        for (const trash of trashNames) {
          try {
            await client.messageMove(uid, trash, { uid: true });
            console.log(`  ✓ Moved to trash (${trash})`);
            moved = true;
            break;
          } catch {
            continue;
          }
        }
        if (!moved) {
          // Fallback: mark as deleted
          await client.messageFlagsAdd(uid, ["\\Deleted"], { uid: true });
          console.log(`  ✓ Marked as deleted (no trash folder found)`);
        }
      }
    }
  } finally {
    lock.release();
  }
} finally {
  await client.logout();
}
