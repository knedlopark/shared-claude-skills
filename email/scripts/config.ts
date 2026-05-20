import { readFileSync, existsSync } from "fs";
import { join } from "path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AccountConfig {
  name: string;
  host: string;
  port: number;
  user: string;
  password: string;
  tls: boolean;
}

interface CredentialsFile {
  accounts: AccountConfig[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FALLBACK_CREDENTIALS_PATH = join(
  process.env.HOME || "~",
  ".claude",
  "email-credentials.json"
);

const SETUP_HINT =
  `Configure credentials either as:\n\n` +
  `  1) Environment variable (preferred):\n` +
  `     EMAIL_ACCOUNTS_JSON='{"accounts":[{"name":"personal",` +
  `"host":"imap.gmail.com","port":993,"user":"you@gmail.com",` +
  `"password":"app-password","tls":true}]}'\n\n` +
  `  2) File at ${FALLBACK_CREDENTIALS_PATH}:\n` +
  `     {\n` +
  `       "accounts": [\n` +
  `         {\n` +
  `           "name": "personal",\n` +
  `           "host": "imap.gmail.com",\n` +
  `           "port": 993,\n` +
  `           "user": "you@gmail.com",\n` +
  `           "password": "app-password",\n` +
  `           "tls": true\n` +
  `         }\n` +
  `       ]\n` +
  `     }\n`;

// ---------------------------------------------------------------------------
// Credentials Loading (env var preferred, file as fallback)
// ---------------------------------------------------------------------------

function parseCredentials(json: string, source: string): CredentialsFile {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error(`Invalid JSON in ${source}`);
  }
  const creds = parsed as CredentialsFile;
  if (!creds || !Array.isArray(creds.accounts)) {
    throw new Error(`Missing or invalid "accounts" array in ${source}`);
  }
  return creds;
}

function loadCredentialsFile(): CredentialsFile {
  // 1) Preferred: env var
  if (process.env.EMAIL_ACCOUNTS_JSON) {
    return parseCredentials(
      process.env.EMAIL_ACCOUNTS_JSON,
      "EMAIL_ACCOUNTS_JSON env var"
    );
  }

  // 2) Fallback: file
  if (existsSync(FALLBACK_CREDENTIALS_PATH)) {
    const data = readFileSync(FALLBACK_CREDENTIALS_PATH, "utf-8");
    return parseCredentials(data, `credentials file ${FALLBACK_CREDENTIALS_PATH}`);
  }

  throw new Error(
    `Email credentials not configured (no EMAIL_ACCOUNTS_JSON env var, ` +
      `no file at ${FALLBACK_CREDENTIALS_PATH}).\n\n${SETUP_HINT}`
  );
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function getAllAccounts(): AccountConfig[] {
  return loadCredentialsFile().accounts;
}

export function getAccount(name: string): AccountConfig {
  const accounts = getAllAccounts();
  const account = accounts.find((a) => a.name === name);
  if (!account) {
    const available = accounts.map((a) => a.name).join(", ");
    throw new Error(
      `Account "${name}" not found. Available accounts: ${available}`
    );
  }
  return account;
}

// ---------------------------------------------------------------------------
// CLI arg parsing helper
// ---------------------------------------------------------------------------

export function parseArgs(args: string[]): Record<string, string | boolean> {
  const result: Record<string, string | boolean> = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith("--")) {
        result[key] = next;
        i++;
      } else {
        result[key] = true;
      }
    }
  }
  return result;
}
