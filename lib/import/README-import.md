# Hromadný import — inštalácia do PunisherEDNA reviews

## Kam skopírovať súbory

```
lib/import/types.ts
lib/import/parse.ts
lib/import/processImport.ts
app/api/admin/import/route.ts
app/admin/import/page.tsx
```

## Čo si over/uprav pred prvým použitím

1. **`@/lib/prisma`** v `processImport.ts` — cesta k vašej zdieľanej Prisma inštancii.
2. **`@/lib/auth`** v `route.ts` — cesta k `authOptions` pre `next-auth`.
3. **Názvy modelov** — kód počíta s `prisma.movie`, `prisma.whereToWatch`, `prisma.tag`,
   `prisma.release`. Ak sa vo vašej `prisma/schema.prisma` volajú inak, premenujte
   v `processImport.ts` (je to jediné miesto, kde sa s Prisma modelmi pracuje).
4. **Unique kľúč pre premiéry** — `release.upsert` potrebuje
   `@@unique([movieId, type])` vo vašom modeli Release. Ak ho nemáte, napíšte mi
   a prerobím to na "zmazať + vytvoriť nanovo" (rovnaká stratégia ako pri `whereToWatch`).
5. **`useT()` v `page.tsx`** — použil som predpokladaný hook z vášho i18n systému.
   Ak sa volá inak (napr. priamo `dict` cez `getDictionary`), uprav importy a volania.

## Formát vstupných súborov

### JSON — pole objektov

```json
[
  {
    "title": "Duna: Časť druhá",
    "year": 2024,
    "tags": ["sci-fi", "akčný"],
    "whereToWatch": [
      { "platform": "Netflix", "url": "https://netflix.com/..." }
    ],
    "premieres": [
      { "type": "KINO", "date": "2024-02-29", "country": "SK", "distributor": "Continental" }
    ]
  }
]
```

### CSV — hlavička s presnými názvami stĺpcov

```
title,year,tags,where_to_watch,premiere_kino,premiere_vod,premiere_dvd,premiere_country,premiere_distributor
Duna: Časť druhá,2024,"sci-fi;akčný","Netflix|https://netflix.com/...;HBO Max|https://hbomax.com/...",2024-02-29,2024-05-15,,SK,Continental
```

- `title`, `year` — povinné, podľa nich sa film v databáze hľadá (nie sa podľa nich nevytvára).
- `tags` — názvy oddelené `;`
- `where_to_watch` — záznamy oddelené `;`, každý v tvare `Platforma|URL`
- `premiere_kino` / `premiere_vod` / `premiere_dvd` — dátum `YYYY-MM-DD`, nechajte prázdne ak sa netýka
- `premiere_country` / `premiere_distributor` — platí pre všetky vyplnené premiéry v danom riadku

Import **len aktualizuje existujúce filmy** (nájde podľa title+year, bez ohľadu na
veľkosť písmen). Film, ktorý sa v databáze nenájde, sa nahlási ako `not_found` a
nevytvorí sa — takto sa import nedá zneužiť na zaplavenie DB duplicitami.

`where_to_watch` sa pri importe **nahradí celým novým zoznamom** zo súboru (staré
platformy pre daný film sa zmažú). Ak namiesto toho potrebujete len dopĺňať
jednotlivé platformy bez mazania ostatných, dajte vedieť.

## Doplnenie do lib/translationRegistry.ts

Podľa vášho zaužívaného postupu (pozri `/areas/punisheredna-preklad.md`) treba
nové viditeľné texty hneď zapojiť. `page.tsx` už volá `t('admin.import.*')` —
stačí pridať zodpovedajúce záznamy do registra (formát prispôsob tomu, čo už
vo vašom `translationRegistry.ts` používate — nižšie je obsah, nie presná syntax):

```
admin.import.title             → "Hromadný import"
admin.import.description       → "Nahrajte súbor vo formáte JSON alebo CSV. Systém nájde filmy podľa názvu a roku a aktualizuje ich platformy na sledovanie, tagy a dátumy premiér."
admin.import.submit            → "Spustiť import"
admin.import.processing        → "Spracúvam..."
admin.import.genericError      → "Import zlyhal."
admin.import.summary           → "Aktualizovaných: {updated}, nenájdených: {notFound}, chýb: {errors}"
admin.import.colRow            → "Riadok"
admin.import.colTitle          → "Názov"
admin.import.colYear           → "Rok"
admin.import.colStatus         → "Stav"
admin.import.colMessage        → "Poznámka"
admin.import.statusUpdated     → "Aktualizované"
admin.import.statusNotFound    → "Nenájdené"
admin.import.statusError       → "Chyba"
```

Nepridal som link na `/admin/import` do navigácie administrácie, keďže neviem,
ako je u vás štruktúrovaná — pridajte odkaz vo svojom admin menu.

## Ak mi pošlete `prisma/schema.prisma`

Rád presne doladím `processImport.ts` (názvy polí, prípadné chýbajúce unique
kľúče) tak, aby sedelo 1:1 bez úprav.
