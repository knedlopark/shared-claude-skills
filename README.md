# shared-claude-skills

Shared [OpenClaw](https://openclaw.ai) skills — reusable across workspaces via git submodule.

## Installation

Add as a git submodule into your OpenClaw workspace:

```bash
git submodule add git@github.com:knedlopark/shared-claude-skills.git skills/shared
```

OpenClaw recursively scans the `skills/` directory — skills in `skills/shared/` are picked up automatically.

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
