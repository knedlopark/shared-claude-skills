---
name: tiketo-faq
description: Odpovídej na otázky o tiketo digiPass produktu, technologiích a bezpečnosti. Používej při dotazech klientů, partnerů nebo členů týmu (zejména Martina) o produktu.
---

# tiketo FAQ

## Kdy použít
- Někdo se ptá co je tiketo digiPass, jak funguje, jaké má výhody
- Otázky o bezpečnosti, technologiích, kompatibilitě
- Martin potřebuje odpověď pro klienta

## Styl odpovědí
- **Pro klienty/Martina:** srozumitelně, bez tech žargonu, přesvědčivě
- **Pro Jakuba/vývojáře:** technicky přesně

## Zdroje informací
Před odpovědí si přečti:
1. `/data/workspace/MEMORY.md` — klíčové info o produktu a technologiích
2. `/data/workspace/memory/tiketo-cms-analysis.md` — technická analýza CMS

## Produkt — tiketo digiPass
- SaaS platforma pro digitální karty do Apple Wallet a Google Wallet
- Využití: věrnostní karty, členské karty, vstupenky, kupóny, vizitky, asistenční karty
- Push notifikace (časové, GPS, iBeacon) přímo na zamčenou obrazovku
- Dynamický obsah — okamžitá aktualizace bez nutnosti nové karty
- Multi-channel distribuce (email, SMS, QR, NFC, web, sociální sítě)
- Offline přístup — karta funguje i bez internetu

## Technologie (laicky)
- Běží na cloudové infrastruktuře Amazonu (AWS) — špičková spolehlivost a dostupnost
- Serverless architektura — automaticky škáluje dle potřeby
- Kapacita 100-300 karet za sekundu
- Kompatibilní s iOS (Apple Wallet) i Android (Google Wallet)
- Dostupné globálně — 1.5+ mld Apple + 2.5+ mld Google zařízení

## Bezpečnost (laicky)
- Data uložena v šifrované databázi na AWS
- Autentizace přes průmyslový standard (AWS Cognito)
- Cloudové řešení s automatickými zálohy
- Žádná data na lokálních serverech — vše v zabezpečeném cloudu
- HTTPS komunikace, šifrovaný přenos dat

## Výhody oproti vlastní aplikaci
- Žádná instalace — karty jdou přímo do nativní peněženky
- Žádné aktualizace — vše se aktualizuje automaticky
- Žádné zabírání místa v telefonu
- Okamžité doručení jedním kliknutím
- Funguje offline

## Konkurenční výhody tiketo
- Silná pozice v CEE regionu
- Vlastní CMS systém pro správu obsahu a členů
- Propracovaný portál passOrganizer
- Flexibilní API pro integrace s existujícími systémy (CRM, POS)
- Personalizovaný přístup ke klientům
