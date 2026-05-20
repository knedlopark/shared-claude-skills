import { ImapFlow } from "imapflow";
import { getAccount, getAllAccounts, parseArgs, type AccountConfig } from "./config.js";

async function listFolders(account: AccountConfig) {
  const client = new ImapFlow({
    host: account.host,
    port: account.port,
    secure: account.tls,
    auth: { user: account.user, pass: account.password },
    logger: false,
  });

  await client.connect();

  try {
    const folders = await client.list();
    console.log(`\n📁 Folders for ${account.name} (${account.user}):\n`);
    for (const folder of folders) {
      const flags = folder.flags?.size ? ` [${[...folder.flags].join(", ")}]` : "";
      const special = folder.specialUse ? ` (${folder.specialUse})` : "";
      console.log(`  ${folder.path}${special}${flags}`);
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
  await listFolders(getAccount(args.account as string));
} else {
  for (const account of getAllAccounts()) {
    await listFolders(account);
  }
}
