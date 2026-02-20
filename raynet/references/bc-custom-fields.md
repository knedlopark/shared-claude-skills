# Business Case - Custom Fields a Classification

Referenční mapování pro vytváření obchodních případů (OP) v Raynet CRM.

## Classification polí

### businessCaseClassification1 (Účetní systém / ERP)

| Hodnota | ID |
|---------|-----|
| Pohoda | 195 |
| Duel | 196 |
| Helios Inuvio | 197 |
| Flexibee | 198 |
| myWAC | 209 |

### businessCaseClassification2 (Instalace)

| Hodnota | ID |
|---------|-----|
| Vlastní server | 225 |
| Cloud (třetí strana) | 226 |
| Účetní firma | 227 |

## Custom Fields pro PI (Rekap)

| Název | Kód | Typ | Popis |
|-------|-----|-----|-------|
| Hospodářský rok | Hospodarsk_e75c6 | date | Začátek hospodářského roku |
| Střediska | Strediska_05e55 | boolean | Používá střediska |
| Činnosti | CINNOSTI_b51d6 | boolean | Používá činnosti |
| Zakázky/Projekty | ZakazkyPro_fadc5 | boolean | Používá zakázky |
| Produkty/Sortiment | Sotriment__f5611 | boolean | Používá sortiment |
| Kategorie produktů | KATEGORIE__29327 | string | Nastavení kategorií |
| Cash flow | CASH_Flow_690b4 | boolean | Používá cash flow |
| Sklad | Sklad_fcb4c | boolean | Používá sklad |
| Produkt (REKAP/PRO) | PRODUKT_re_d7908 | string | Typ produktu |
| Tržby mimo fakturaci | Obrat_i_mi_f2f2f | boolean | Používá tržby mimo fakturaci |
| Billing email | BILLING_EM_01c32 | string | Email pro fakturaci |

## Custom Fields pro Partnerství

| Název | Kód | Typ | Popis |
|-------|-----|-----|-------|
| Partner | Partner_0d407 | boolean | Je to partnerský obchod |
| Fakturace přes partnera | FAKTURACE__8de90 | boolean | Fakturace jde přes partnera |
| Partner název | Partner__n_051b4 | string | Název partnera (ARROWS, SLUTO, ...) |

## Příklad použití

```bash
# Vytvoření OP s classification polími
npx tsx create-business-case.ts \
  --name="PI - Klient s.r.o." \
  --company=12345 \
  --phase=2 \
  --custom-field="businessCaseClassification1=195" \
  --custom-field="businessCaseClassification2=226" \
  --custom-field="Hospodarsk_e75c6=2026-01-01" \
  --custom-field="Strediska_05e55=true" \
  --custom-field="PRODUKT_re_d7908=REKAP"
```

## Poznámky

- Custom field kódy jsou generované Raynetem a mohou se lišit mezi instancemi
- Pro zjištění aktuálních kódů použij: `npx tsx get-enums.ts business-case-custom-fields`
- Classification polí se nastavují přes `--custom-field`, ne přes dedikované parametry
