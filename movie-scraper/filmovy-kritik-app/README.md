# Filmový kritik — web s administráciou a registráciou

Next.js aplikácia pre filmového kritika: verejné recenzie filmov, registrácia
a prihlásenie pre čitateľov (aby mohli komentovať) a chránená administrácia
(písanie/úprava/mazanie recenzií, nahrávanie fotiek).

## Čo to obsahuje

- **Verejná časť** — zoznam recenzií, detail recenzie, filter podľa žánru, komentáre
- **Registrácia a prihlásenie** pre čitateľov (e-mail + heslo, heslá sú bezpečne hashované cez bcrypt)
- **Administrácia** (`/admin`) — chránená, prístupná len účtu s rolou ADMIN: nová recenzia, úprava, mazanie, nahrávanie fotky (automaticky sa zmenší)
- **Databáza** cez Prisma + PostgreSQL

## 1. Príprava databázy (zadarmo)

Najjednoduchšie je [neon.tech](https://neon.tech) (alebo Supabase / Railway):

1. Zaregistruj sa, vytvor nový projekt/databázu
2. Skopíruj connection string (vyzerá ako `postgresql://user:pass@host/db?sslmode=require`)

## 2. Nastavenie projektu lokálne

```bash
npm install
cp .env.example .env
```

Otvor `.env` a vyplň:

- `DATABASE_URL` — connection string z kroku 1
- `NEXTAUTH_SECRET` — vygeneruj príkazom `openssl rand -base64 32`
- `NEXTAUTH_URL` — `http://localhost:3000` pre lokálny beh
- `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` — tvoj prvý administrátorský účet

## 3. Vytvorenie databázových tabuliek a admin účtu

```bash
npx prisma migrate dev --name init
npx prisma db seed
```

Tento krok vytvorí tabuľky a tvoj administrátorský účet (podľa `.env`), cez ktorý sa prihlásiš do `/admin`.

## 4. Spustenie

```bash
npm run dev
```

Otvor http://localhost:3000. Prihlás sa cez `/login` s údajmi z `ADMIN_EMAIL` / `ADMIN_PASSWORD` a choď na `/admin`.

## 5. Nasadenie na internet (Vercel, zadarmo)

1. Nahraj tento projekt na GitHub (alebo priamo cez `vercel` CLI bez GitHubu)
2. Choď na [vercel.com](https://vercel.com) → New Project → vyber repozitár
3. V nastaveniach projektu (Environment Variables) pridaj presne tie isté premenné čo v `.env`
   (pre `NEXTAUTH_URL` daj tam adresu, ktorú ti Vercel pridelí, napr. `https://tvoj-web.vercel.app`)
4. Deploy
5. Po prvom nasadení spusti raz (napr. cez `vercel env pull` a lokálne, alebo cez Vercel CLI `vercel exec`):
   ```bash
   npx prisma migrate deploy
   npx prisma db seed
   ```
   aby sa vytvorili tabuľky a admin účet aj v produkčnej databáze.

## Ako to funguje pre bežného čitateľa

1. Klikne na "Registrácia", zadá meno/e-mail/heslo → dostane READER účet
2. Prihlási sa → môže na každej recenzii pridávať komentáre
3. Nemá prístup do `/admin` (presmeruje ho to na prihlásenie)

## Ako to funguje pre teba (administrátora)

1. Prihlásiš sa účtom, ktorý vznikol pri `npx prisma db seed`
2. V navigácii sa ti zobrazí odkaz "Administrácia"
3. Tam pridávaš/upravuješ/mažeš recenzie vrátane fotiek a hodnotenia hviezdičkami

## Poznámka k obrázkom

Fotky sa ukladajú priamo do databázy ako Base64 (po automatickom zmenšení),
takže nepotrebuješ žiadne ďalšie úložisko (napr. S3) — funguje to hneď po nasadení.
Pri veľmi veľkom počte recenzií s fotkami zváž neskôr presun na externé úložisko obrázkov.

## Zmena hesla / pridanie ďalšieho administrátora

Nová registrácia cez web vždy vytvorí len čitateľský (READER) účet — je to zámerne kvôli bezpečnosti.
Ďalšieho administrátora vytvoríš buď:
- úpravou `ADMIN_EMAIL` v `.env` na nový e-mail a opätovným spustením `npx prisma db seed`, alebo
- priamo v databáze zmenou `role` daného používateľa na `ADMIN` (napr. cez `npx prisma studio`)
