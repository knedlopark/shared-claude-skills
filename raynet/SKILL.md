---
name: raynet
description: |
  Raynet CRM API integration. This skill should be used when users want to:
  - Search for companies or contacts in Raynet CRM
  - View company/contact details
  - Create or update companies, leads, business cases
  - List or create activities and tasks
  - Search business cases (deals)
  - Search leads
  Auto-invoke for questions containing: raynet, CRM, firemní kontakt, obchodní případ
---

# Raynet CRM Skill

Integrace s Raynet CRM přes REST API.

## Prerekvizity

> ⚠️ **Credentials jsou již nastavené a fungují.** NEŽÁDEJ uživatele o credentials — rovnou spouštěj skripty.

Env proměnné `RAYNET_INSTANCE`, `RAYNET_API_USER`, `RAYNET_API_TOKEN` jsou nakonfigurované v OpenClaw. Skripty je čtou automaticky.

## Dostupné skripty

Všechny skripty spouštěj z kořenového adresáře projektu pomocí `npx tsx`.

### Vyhledávání firem

#### search-company.ts

Vyhledání firem s podporou řazení a pokročilého filtrování.

```bash
# Všechny firmy seřazené podle jména
npx tsx ./skills/raynet/scripts/search-company.ts --all --sort=name --limit=100

# Fulltext vyhledávání
npx tsx ./skills/raynet/scripts/search-company.ts "název firmy"

# Seřazené podle data vytvoření (nejnovější první)
npx tsx ./skills/raynet/scripts/search-company.ts --all --sort=rowInfo.createdAt --order=DESC --limit=10

# Filtr podle vlastníka (jméno)
npx tsx ./skills/raynet/scripts/search-company.ts --owner-name="Roman Kytka" --sort=name

# Filtr podle názvu s wildcard
npx tsx ./skills/raynet/scripts/search-company.ts --name="RAY%"

# Vyhledání podle IČO
npx tsx ./skills/raynet/scripts/search-company.ts --ico=12345678

# Firmy vytvořené v roce 2024
npx tsx ./skills/raynet/scripts/search-company.ts --created-after=2024-01-01 --created-before=2025-01-01

# JSON výstup
npx tsx ./skills/raynet/scripts/search-company.ts "firma" --json
```

**Dostupné parametry:**

| Parametr | Popis |
|----------|-------|
| `--all` | Vypsat všechny firmy bez filtrů |
| `--limit=N` | Max počet výsledků (default: 20, max: 1000) |
| `--offset=N` | Přeskočit prvních N výsledků |
| `--sort=COLUMN` | Řadit podle: `id`, `name`, `lastName`, `regNumber`, `rating`, `state`, `role`, `rowInfo.createdAt`, `rowInfo.updatedAt` |
| `--order=ASC\|DESC` | Směr řazení (default: ASC) |
| `--name=TEXT` | Filtr podle názvu (podporuje % wildcard) |
| `--ico=ICO` | Filtr podle IČO |
| `--owner=ID` | Filtr podle vlastníka (ID) |
| `--owner-name=NAME` | Filtr podle vlastníka (jméno - automaticky najde ID) |
| `--rating=VALUE` | Filtr podle ratingu |
| `--state=VALUE` | Filtr podle stavu |
| `--role=VALUE` | Filtr podle role |
| `--category=ID` | Filtr podle kategorie |
| `--tags=TAG1,TAG2` | Filtr podle tagů (OR logika) |
| `--created-after=DATE` | Vytvořeno po datu (YYYY-MM-DD) |
| `--created-before=DATE` | Vytvořeno před datem |
| `--updated-after=DATE` | Upraveno po datu |
| `--updated-before=DATE` | Upraveno před datem |
| `--json` | Výstup v JSON formátu |

> ⚠️ **Poznámka k tagům:** Parametr `--tags` používá OR logiku - vrátí entity s **jakýmkoliv** z uvedených tagů. Pro AND logiku (entity se všemi tagy) filtruj výsledky dodatečně.

### Vyhledávání kontaktů

#### search-person.ts

Vyhledání kontaktů s podporou řazení a pokročilého filtrování.

```bash
# Všechny kontakty seřazené podle příjmení
npx tsx ./skills/raynet/scripts/search-person.ts --all --sort=lastName --limit=100

# Fulltext vyhledávání
npx tsx ./skills/raynet/scripts/search-person.ts "Jan Novák"

# Nejnovější kontakty
npx tsx ./skills/raynet/scripts/search-person.ts --all --sort=rowInfo.createdAt --order=DESC --limit=10

# Filtr podle vlastníka (jméno)
npx tsx ./skills/raynet/scripts/search-person.ts --owner-name="Roman Kytka" --sort=lastName

# Filtr podle příjmení s wildcard
npx tsx ./skills/raynet/scripts/search-person.ts --last-name="Nov%"

# JSON výstup
npx tsx ./skills/raynet/scripts/search-person.ts "novák" --json
```

**Dostupné parametry:**

| Parametr | Popis |
|----------|-------|
| `--all` | Vypsat všechny kontakty bez filtrů |
| `--limit=N` | Max počet výsledků (default: 20, max: 1000) |
| `--offset=N` | Přeskočit prvních N výsledků |
| `--sort=COLUMN` | Řadit podle: `id`, `firstName`, `lastName`, `rowInfo.createdAt`, `rowInfo.updatedAt` |
| `--order=ASC\|DESC` | Směr řazení (default: ASC) |
| `--first-name=TEXT` | Filtr podle jména (podporuje % wildcard) |
| `--last-name=TEXT` | Filtr podle příjmení |
| `--owner=ID` | Filtr podle vlastníka (ID) |
| `--owner-name=NAME` | Filtr podle vlastníka (jméno - automaticky najde ID) |
| `--category=ID` | Filtr podle kategorie |
| `--tags=TAG1,TAG2` | Filtr podle tagů (OR logika) |
| `--created-after=DATE` | Vytvořeno po datu (YYYY-MM-DD) |
| `--created-before=DATE` | Vytvořeno před datem |
| `--updated-after=DATE` | Upraveno po datu |
| `--updated-before=DATE` | Upraveno před datem |
| `--json` | Výstup v JSON formátu |

> ⚠️ **Poznámka k tagům:** Parametr `--tags` používá OR logiku - vrátí entity s **jakýmkoliv** z uvedených tagů. Pro AND logiku (entity se všemi tagy) filtruj výsledky dodatečně.

### Vyhledávání leadů

#### search-lead.ts

Vyhledání leadů s podporou řazení a pokročilého filtrování.

```bash
# Všechny leady seřazené podle data vytvoření (nejnovější první)
npx tsx ./skills/raynet/scripts/search-lead.ts --all --sort=rowInfo.createdAt --order=DESC

# Fulltext vyhledávání
npx tsx ./skills/raynet/scripts/search-lead.ts "projekt"

# Leady konkrétního obchodníka
npx tsx ./skills/raynet/scripts/search-lead.ts --owner-name="Roman Kytka" --sort=rowInfo.createdAt --order=DESC

# Leady vytvořené v roce 2024
npx tsx ./skills/raynet/scripts/search-lead.ts --created-after=2024-01-01 --created-before=2025-01-01

# JSON výstup
npx tsx ./skills/raynet/scripts/search-lead.ts --all --json
```

**Dostupné parametry:**

| Parametr | Popis |
|----------|-------|
| `--all` | Vypsat všechny leady bez filtrů |
| `--limit=N` | Max počet výsledků (default: 20, max: 1000) |
| `--offset=N` | Přeskočit prvních N výsledků |
| `--sort=COLUMN` | Řadit podle: `id`, `topic`, `priority`, `rowInfo.createdAt`, `rowInfo.updatedAt` |
| `--order=ASC\|DESC` | Směr řazení (default: ASC) |
| `--owner=ID` | Filtr podle vlastníka (ID) |
| `--owner-name=NAME` | Filtr podle vlastníka (jméno - automaticky najde ID) |
| `--phase=ID` | Filtr podle fáze leadu |
| `--contact-source=ID` | Filtr podle zdroje kontaktu (API filtr, např. 251=LEADY.CZ) |
| `--tags=TAG1,TAG2` | Filtr podle tagů (OR logika) |
| `--exclude-tags=TAG1,TAG2` | Vyloučit leady s těmito tagy (lokální filtr) |
| `--created-after=DATE` | Vytvořeno po datu (YYYY-MM-DD) |
| `--created-before=DATE` | Vytvořeno před datem |
| `--updated-after=DATE` | Upraveno po datu |
| `--updated-before=DATE` | Upraveno před datem |
| `--json` | Výstup v JSON formátu |

> ⚠️ **Poznámka k tagům:** Parametr `--tags` používá OR logiku - vrátí entity s **jakýmkoliv** z uvedených tagů. Pro AND logiku (entity se všemi tagy) filtruj výsledky dodatečně.

> ⚠️ **Poznámka k exclude-tags:** Raynet API nepodporuje negativní filtr na tagy. Parametr `--exclude-tags` stahuje data z API a filtruje lokálně. Při velkém počtu leadů kombinuj s dalšími API filtry (`--phase`, `--contact-source`) pro lepší výkon.

### Obchodní případy

#### search-business-case.ts

Vyhledání obchodních případů s podporou filtrování a řazení.

```bash
# Základní fulltext vyhledávání
npx tsx ./skills/raynet/scripts/search-business-case.ts "projekt"

# Všechny OP seřazené podle hodnoty
npx tsx ./skills/raynet/scripts/search-business-case.ts --all --sort=totalAmount --order=DESC

# OP s odhadem uzavření v daném měsíci
npx tsx ./skills/raynet/scripts/search-business-case.ts --scheduled-end-after=2026-01-01 --scheduled-end-before=2026-01-31 --all

# OP ve fázi Trial
npx tsx ./skills/raynet/scripts/search-business-case.ts --phase=9 --all

# OP kategorie CUST seřazené podle hodnoty
npx tsx ./skills/raynet/scripts/search-business-case.ts --category=118 --sort=totalAmount --order=DESC --all

# OP konkrétního obchodníka
npx tsx ./skills/raynet/scripts/search-business-case.ts --owner-name="Roman Kytka" --all
```

| Parametr | Popis |
|----------|-------|
| `--all` | Výpis bez fulltext dotazu |
| `--phase=ID` | Filtr podle fáze (Trial=9, Split=12, Billing=10, V procesu=13, Review=16, Výhra=4) |
| `--category=ID` | Filtr podle kategorie (CUST=118, CON=281, PI=116, RP=117, Změna PI=287) |
| `--owner-name=NAME` | Filtr podle vlastníka (automaticky najde ID) |
| `--scheduled-end-after=DATE` | Odhad uzavření od data (YYYY-MM-DD) |
| `--scheduled-end-before=DATE` | Odhad uzavření do data (YYYY-MM-DD) |
| `--sort=COLUMN` | Řazení (id, name, totalAmount, scheduledEnd, rowInfo.createdAt, rowInfo.updatedAt) |
| `--order=ASC\|DESC` | Směr řazení |

### Enum hodnoty (ID)

Pro získání aktuálních ID hodnot pro kategorie, fáze, zdroje atd. použij:

```bash
npx tsx ./skills/raynet/scripts/get-enums.ts              # Všechny enum hodnoty
npx tsx ./skills/raynet/scripts/get-enums.ts --type=bc-phase  # Pouze fáze OP
npx tsx ./skills/raynet/scripts/get-enums.ts --json       # JSON výstup
```

**Dostupné typy:** `company-category`, `contact-source`, `lead-phase`, `bc-phase`, `bc-category`, `currency`

**Quick reference:**
- [Lead Phase hodnoty](./references/lead-phases.md) - fáze leadů

### Vytváření záznamů (CREATE)

#### create-company.ts

Vytvoření nové firmy.

```bash
npx tsx ./skills/raynet/scripts/create-company.ts --name="Firma s.r.o."
npx tsx ./skills/raynet/scripts/create-company.ts --name="Firma" --ico=12345678 --email=info@firma.cz
npx tsx ./skills/raynet/scripts/create-company.ts --name="Klient" --owner-name="Roman Kytka" --role=A_POTENTIAL
npx tsx ./skills/raynet/scripts/create-company.ts --name="Firma" --category=222 --contact-source=162 --street="Ulice 123" --city="Praha"
```

Parametry: `--name` (povinný), `--ico`, `--dic`, `--owner`, `--owner-name`, `--rating`, `--state`, `--role`, `--category`, `--contact-source`, `--email`, `--tel`, `--www`, `--street`, `--city`, `--zip`, `--country`, `--notice`

#### create-business-case.ts

Vytvoření obchodního případu.

```bash
npx tsx ./skills/raynet/scripts/create-business-case.ts --name="Projekt ABC" --company=123
npx tsx ./skills/raynet/scripts/create-business-case.ts --name="Nový OP" --company=123 --amount=50000 --owner-name="Roman Kytka"
npx tsx ./skills/raynet/scripts/create-business-case.ts --name="PI - Klient" --company=123 --phase=2 --category=116 --source=162
npx tsx ./skills/raynet/scripts/create-business-case.ts --name="OP" --company=123 --custom-field="Partner_0d407=true" --custom-field="Partner__n_051b4=Digiro"
```

Parametry: `--name` (povinný), `--company`, `--person`, `--owner`, `--owner-name`, `--phase`, `--category`, `--source`, `--amount`, `--currency`, `--scheduled-end`, `--valid-from`, `--valid-till`, `--description`, `--custom-field` (lze použít vícekrát)

#### create-lead.ts

Vytvoření leadu.

```bash
npx tsx ./skills/raynet/scripts/create-lead.ts --topic="Nový projekt"
npx tsx ./skills/raynet/scripts/create-lead.ts --topic="Lead" --company-name="Firma s.r.o." --email=info@firma.cz
npx tsx ./skills/raynet/scripts/create-lead.ts --topic="Zájem" --owner-name="Roman Kytka" --priority=HIGH
```

Parametry: `--topic` (povinný), `--owner`, `--owner-name`, `--phase`, `--priority`, `--company-name`, `--first-name`, `--last-name`, `--email`, `--tel`, `--notice`

### Aktualizace záznamů (UPDATE)

#### update-company.ts

Aktualizace existující firmy.

```bash
npx tsx ./skills/raynet/scripts/update-company.ts 123 --name="Nový název"
npx tsx ./skills/raynet/scripts/update-company.ts 123 --email=novy@email.cz --tel=123456789
npx tsx ./skills/raynet/scripts/update-company.ts 123 --role=B_ACTUAL --owner-name="Roman Kytka"
```

#### update-business-case.ts

Aktualizace obchodního případu.

```bash
npx tsx ./skills/raynet/scripts/update-business-case.ts 123 --name="Nový název"
npx tsx ./skills/raynet/scripts/update-business-case.ts 123 --amount=100000 --phase=5
```

#### update-lead.ts

Aktualizace leadu včetně práce s tagy.

```bash
# Základní aktualizace
npx tsx ./skills/raynet/scripts/update-lead.ts 123 --topic="Nový název"
npx tsx ./skills/raynet/scripts/update-lead.ts 123 --phase=5 --priority=HIGH

# Práce s tagy
npx tsx ./skills/raynet/scripts/update-lead.ts 123 --tags="Firma,Studený,1.email"  # Nastaví tagy (nahradí stávající)
npx tsx ./skills/raynet/scripts/update-lead.ts 123 --add-tags="Odesláno"           # Přidá tag (zachová stávající)
npx tsx ./skills/raynet/scripts/update-lead.ts 123 --remove-tags="Poslat"          # Odebere tag
npx tsx ./skills/raynet/scripts/update-lead.ts 123 --add-tags="1.email,Odesláno" --remove-tags="Poslat"  # Kombinace
```

**Parametry pro tagy:**
- `--tags=TAG1,TAG2` - Nastaví tagy (nahradí všechny stávající)
- `--add-tags=TAG1,TAG2` - Přidá tagy (zachová stávající)
- `--remove-tags=TAG1,TAG2` - Odebere tagy

#### update-person.ts

Aktualizace kontaktu.

```bash
npx tsx ./skills/raynet/scripts/update-person.ts 123 --first-name="Jan" --last-name="Novák"
npx tsx ./skills/raynet/scripts/update-person.ts 123 --email=jan@email.cz --tel=123456789
```

### Detaily

#### get-company.ts

Detail firmy podle ID.

```bash
npx tsx ./skills/raynet/scripts/get-company.ts 12345
npx tsx ./skills/raynet/scripts/get-company.ts 12345 --json
```

#### get-person.ts

Detail kontaktu podle ID.

```bash
npx tsx ./skills/raynet/scripts/get-person.ts 67890
npx tsx ./skills/raynet/scripts/get-person.ts 67890 --json
```

### Aktivity

#### list-activities.ts

Seznam aktivit s možností filtrování.

```bash
npx tsx ./skills/raynet/scripts/list-activities.ts
npx tsx ./skills/raynet/scripts/list-activities.ts --company=123
npx tsx ./skills/raynet/scripts/list-activities.ts --person=456
npx tsx ./skills/raynet/scripts/list-activities.ts --limit=10 --json
```

#### create-activity.ts

Vytvoření nové aktivity.

```bash
npx tsx ./skills/raynet/scripts/create-activity.ts --title="Schůzka" --company=123
npx tsx ./skills/raynet/scripts/create-activity.ts --title="Telefonát" --person=456 --priority=HIGH
npx tsx ./skills/raynet/scripts/create-activity.ts --title="Meeting" --company=123 --from="2025-01-15 10:00" --till="2025-01-15 11:00"
```

Parametry:
- `--title` - název aktivity (povinný)
- `--company` - ID firmy
- `--person` - ID kontaktu
- `--owner` - ID vlastníka
- `--category` - ID kategorie
- `--from` - začátek (formát: "YYYY-MM-DD HH:mm")
- `--till` - konec (formát: "YYYY-MM-DD HH:mm")
- `--description` - popis
- `--priority` - priorita: DEFAULT, HIGH, HIGHEST

### Statistiky

#### entity-stats.ts

Přehled počtu všech Raynet entit.

```bash
npx tsx ./skills/raynet/scripts/entity-stats.ts
npx tsx ./skills/raynet/scripts/entity-stats.ts --json
```

### Produkty

#### list-products.ts

Výpis produktů z Raynetu s kódem, názvem, cenou a produktovou řadou.

```bash
# Všechny produkty
npx tsx ./skills/raynet/scripts/list-products.ts

# Fulltextové vyhledávání
npx tsx ./skills/raynet/scripts/list-products.ts --fulltext="Software"

# Filtr podle kódu
npx tsx ./skills/raynet/scripts/list-products.ts --code=R03

# Filtr podle produktové řady
npx tsx ./skills/raynet/scripts/list-products.ts --product-line="Software"

# JSON výstup
npx tsx ./skills/raynet/scripts/list-products.ts --json
```

| Parametr | Popis |
|----------|-------|
| `--fulltext=TEXT` | Fulltextové vyhledávání |
| `--code=CODE` | Filtr podle kódu produktu (LIKE) |
| `--product-line=NAME` | Filtr podle produktové řady (lokální filtr) |
| `--limit=N` | Max počet výsledků (default: 100) |
| `--json` | Výstup v JSON formátu |

### Položky obchodního případu

#### add-bc-item.ts

Přidání produktové položky do obchodního případu.

```bash
# Přidání produktu s výchozí cenou z ceníku
npx tsx ./skills/raynet/scripts/add-bc-item.ts --bc=3091 --product=123 --count=1

# Přidání s vlastní cenou a jednotkou
npx tsx ./skills/raynet/scripts/add-bc-item.ts --bc=3091 --product=123 --count=2.5 --price=1600 --unit=hod

# Přidání se slevou
npx tsx ./skills/raynet/scripts/add-bc-item.ts --bc=3091 --product=123 --count=1 --discount=10
```

| Parametr | Popis |
|----------|-------|
| `--bc=ID` | ID obchodního případu (povinný) |
| `--product=ID` | ID produktu z `list-products.ts` (povinný) |
| `--count=N` | Množství, může být desetinné (povinný) |
| `--price=N` | Vlastní cena (přepíše ceníkovou) |
| `--unit=TEXT` | Jednotka (hod, ks, měs) |
| `--discount=N` | Sleva v % (0-100) |
| `--description=TEXT` | Popis položky |

## Přímé API volání

Pro entity, které nemají dedikovaný skript, lze použít generickou metodu `apiRequest()` v RaynetClient. Toto umožňuje číst (i zapisovat) libovolné Raynet entity.

### Příklad přímého volání v TypeScript

```typescript
import { RaynetClient } from "./skills/raynet/scripts/lib/raynet-client.js";

const client = RaynetClient.createFromCredentialsFile();

// Čtení nabídek (offer)
const offers = await client.apiRequest("GET", "/offer/?limit=10");
console.log(offers);

// Čtení produktů
const products = await client.apiRequest("GET", "/product/");

// Detail projektu
const project = await client.apiRequest("GET", "/project/123/");
```

### Dostupné entity bez dedikovaných skriptů

| Entita | Endpoint | Popis |
|--------|----------|-------|
| offer | `/offer/` | Nabídky |
| order | `/order/` | Objednávky |
| invoice | `/invoice/` | Faktury |

| priceList | `/priceList/` | Ceníky |
| project | `/project/` | Projekty |
| email | `/email/` | E-maily |
| meeting | `/meeting/` | Schůzky |
| phoneCall | `/phoneCall/` | Telefonáty |
| gdprForm | `/gdprForm/` | GDPR formuláře |

## API reference

### Autentizace
- Basic Auth: `username:apiKey`
- Header: `X-Instance-Name: your-instance`
- Base URL: `https://app.raynet.cz/api/v2/`

### Rate limits
- 24,000 requests/den
- Max 4 concurrent connections

### Hlavní endpointy

| Endpoint | Metoda | Popis |
|----------|--------|-------|
| `/company/` | GET, PUT | Seznam/vyhledání/vytvoření firem |
| `/company/{id}/` | GET, POST | Detail/aktualizace firmy |
| `/person/` | GET | Seznam/vyhledání kontaktů |
| `/person/{id}/` | GET, POST | Detail/aktualizace kontaktu |
| `/activity/` | GET, POST | Seznam/vytvoření aktivit |
| `/task/` | GET, POST | Seznam/vytvoření tasků |
| `/businessCase/` | GET, PUT | Seznam/vytvoření obchodních případů |
| `/businessCase/{id}/` | GET, POST | Detail/aktualizace obchodního případu |
| `/lead/` | GET, PUT | Seznam/vytvoření leadů |
| `/lead/{id}/` | GET, POST | Detail/aktualizace leadu |
| `/user/` | GET | Seznam uživatelů (vlastníků) |

### Query parametry pro vyhledávání

#### Základní
- `fulltext` - fulltextové vyhledávání
- `limit` - max počet výsledků (max 1000)
- `offset` - přeskočit prvních N záznamů

#### Řazení
- `sortColumn` - sloupec pro řazení
- `sortDirection` - `ASC` nebo `DESC`

#### Filter operátory
Filtry se zadávají ve formátu `field[OPERATOR]=value`:
- `EQ` - rovná se (výchozí)
- `NE` - nerovná se
- `LIKE` - obsahuje (case-sensitive)
- `LIKE_NOCASE` - obsahuje (case-insensitive)
- `GT` - větší než
- `GE` - větší nebo rovno
- `LT` - menší než
- `LE` - menší nebo rovno
- `IN` - hodnota v seznamu

### Datumové filtry

Raynet API vyžaduje formát `yyyy-MM-dd HH:mm` pro datumové filtry. Skripty automaticky konvertují:
- `--created-after=2024-01-01` → `rowInfo.createdAt[GT]=2024-01-01 00:00`
- `--created-before=2024-12-31` → `rowInfo.createdAt[LT]=2024-12-31 23:59`

Příklad přímého API volání:
```
GET /company/?rowInfo.createdAt[GT]=2024-01-01 00:00&sortColumn=rowInfo.createdAt&sortDirection=DESC
```

## Credentials

### Preferovaný způsob: Environment proměnné

Nastavit v OpenClaw config (`env` sekce):

- `RAYNET_INSTANCE` — název instance (např. `your-instance`)
- `RAYNET_API_USER` — email uživatele
- `RAYNET_API_TOKEN` — API klíč

### Alternativa: Soubor `~/.raynet/credentials.json`

```json
{
  "instanceName": "your-instance",
  "username": "user@example.com",
  "apiKey": "your-api-key"
}
```

Pro více instancí:

```json
{
  "instances": [
    {
      "name": "main",
      "instanceName": "your-instance",
      "username": "user@example.com",
      "apiKey": "api-key-1",
      "default": true
    },
    {
      "name": "other",
      "instanceName": "other-instance",
      "username": "user@other.com",
      "apiKey": "api-key-2"
    }
  ]
}
```

> Env proměnné mají přednost před souborem.

## URL formáty

Pro vytvoření odkazů na detail záznamů v Raynet web UI:

| Entita | URL formát |
|--------|------------|
| Obchodní případ | `https://app.raynet.cz/{INSTANCE_NAME}/?view=DetailView&en=BusinessCase&ei={ID}` |
| Firma | `https://app.raynet.cz/{INSTANCE_NAME}/?view=DetailView&en=Company&ei={ID}` |
| Kontakt | `https://app.raynet.cz/{INSTANCE_NAME}/?view=DetailView&en=Person&ei={ID}` |
| Lead | `https://app.raynet.cz/{INSTANCE_NAME}/?view=DetailView&en=Lead&ei={ID}` |

Příklad: `https://app.raynet.cz/{INSTANCE_NAME}/?view=DetailView&en=BusinessCase&ei=12345`

## Known Limitations

### API limit 1000 záznamů

> ⚠️ Raynet API vrací **max 1000 záznamů** na jeden dotaz. Při větším počtu výsledků:
> - Použij přesnější filtry (`--phase`, `--contact-source`, `--tags`) pro redukci výsledků
> - Nebo použij `--offset=1000` pro další stránku výsledků
> - Skript nevypíše varování - vždy kontroluj `totalCount` vs počet vrácených záznamů

### Nepodporované filtry

- **Negativní filtr na tagy** - Raynet API nepodporuje `tags[NE]` ani podobné operátory. Použij `--exclude-tags` pro lokální filtrování.

## Performance Best Practices

### Preferuj API filtry před lokálním filtrováním

```bash
# ❌ ŠPATNĚ: Stáhne 1166+ leadů, filtruje lokálně
npx tsx search-lead.ts --phase=120 --limit=1000
# Pak ručně filtrovat na contactSource.value == "LEADY.CZ"

# ✅ SPRÁVNĚ: Stáhne pouze 57 relevantních leadů (20× rychleji)
npx tsx search-lead.ts --phase=120 --contact-source=251 --limit=100
```

**Důvod:** API filtry redukují data na serveru, snižují riziko překročení limitu 1000 záznamů a zrychlují odezvu.

### Běžné contact source ID

| ID | Zdroj |
|----|-------|
| 251 | LEADY.CZ |

Pro aktuální hodnoty: `npx tsx get-enums.ts --type=contact-source`

## Odkazy

- [Raynet CRM API dokumentace](https://app.raynet.cz/api/doc/)
- [GitHub příklady](https://github.com/raynetcrm/api)
