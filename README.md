# shared-claude-skills

Shared [OpenClaw](https://openclaw.ai) skills — reusable across workspaces via git submodule.

## Installation

### 1. Add as a git submodule

```bash
cd /data/workspace
git submodule add git@github.com:knedlopark/shared-claude-skills.git skills/shared
git commit -m "Add shared-claude-skills submodule"
```

OpenClaw recursively scans the `skills/` directory — skills in `skills/shared/` are picked up automatically.

### 2. Deploy key (if needed)

If your workspace doesn't have repo access via existing SSH keys, generate a dedicated deploy key:

```bash
ssh-keygen -t ed25519 -C "your-agent@openclaw-shared-skills" -f ~/.ssh/id_github_shared_skills -N ""
```

Add a host alias to `~/.ssh/config`:

```
Host github.com-shared-skills
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_github_shared_skills
  IdentitiesOnly yes
```

Then use the alias when adding the submodule:

```bash
git submodule add git@github.com-shared-skills:knedlopark/shared-claude-skills.git skills/shared
```

Add the public key (`~/.ssh/id_github_shared_skills.pub`) as a deploy key on GitHub → repo Settings → Deploy keys. Enable write access if the agent should push changes.

### 3. Keep skills updated

Add a periodic pull to your `HEARTBEAT.md`:

```markdown
## Shared Skills - pull updates
Run `cd /data/workspace/skills/shared && git pull --ff-only` once per day to pick up new shared skills.
```

### 4. Cloning a workspace that already has the submodule

```bash
git clone --recurse-submodules <workspace-repo-url>
# or, if already cloned:
git submodule update --init --recursive
```

## Skills

### Raynet CRM (`raynet/`)

Full integration with [Raynet CRM](https://raynet.cz) REST API v2. Enables the AI agent to work with CRM data directly — searching, reading, creating and updating records.

**What it does:**

- **Companies** — search, view details, create, update
- **Contacts (people)** — search, view details, create, update
- **Business cases (deals)** — search, create, update, add line items
- **Leads** — search, create, update
- **Activities** — list and create (meetings, tasks, phone calls)
- **Products** — list available products (for deal line items)
- **Enums** — fetch picklist values (stages, categories, etc.)
- **Stats** — entity count overview across the whole CRM

**Use cases:**

- "Najdi firmu XY v Raynetu" → searches companies by name
- "Jaké mám schůzky tento týden?" → lists activities filtered by date
- "Založ nový obchodní případ pro firmu ABC" → creates a deal with company relation
- "Aktualizuj kontakt — změň email" → updates person record
- "Kolik máme leadů?" → entity stats overview

**Requirements:**

- Raynet API credentials (`RAYNET_INSTANCE`, `RAYNET_API_USER`, `RAYNET_API_TOKEN`) configured as env variables in OpenClaw
- Node.js runtime with `npx tsx` available

**Tech:** 19 TypeScript scripts with a shared Raynet API client (`scripts/lib/raynet-client.ts`), HTTP Basic Auth, automatic error handling.
