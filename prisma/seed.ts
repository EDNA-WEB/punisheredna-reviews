import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || 'Filmový Kritik';

  if (!email || !password) {
    console.log('ADMIN_EMAIL alebo ADMIN_PASSWORD chýba v .env — admin sa nevytvoril.');
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Používateľ ${email} už existuje, preskakujem.`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: { email, name, passwordHash, role: 'ADMIN' }
  });
  console.log(`Administrátorský účet vytvorený: ${email}`);
}

const PREMIERES: { title: string; releaseDate: string; year: string; country: string; genres: string; director: string }[] = [
  { title: 'LINKIN PARK: UNSHATTER', releaseDate: '2026-09-30', year: '2026', country: 'USA', genres: 'Dokumentárny, Hudobný', director: 'Joseph Hahn' },
  { title: 'Avengers: Endgame', releaseDate: '2026-09-24', year: '2019', country: 'USA', genres: 'Akčný, Dobrodružný, Sci-Fi', director: 'Anthony Russo, Joe Russo' },
  { title: 'Crawlers', releaseDate: '2026-09-24', year: '2026', country: 'USA', genres: 'Horor, Thriller', director: 'Angel Gómez Hernández' },
  { title: 'Kdyby se holubi proměnili ve zlato', releaseDate: '2026-09-24', year: '2026', country: 'Česko / Slovensko', genres: 'Dokumentárny', director: 'Pepa Lubojacki' },
  { title: 'Na hraně smrti 2: Deadpoint', releaseDate: '2026-09-24', year: '2026', country: 'USA', genres: 'Thriller', director: 'Michael Spierig, Peter Spierig' },
  { title: 'Proč bychom se nezabili', releaseDate: '2026-09-24', year: '2026', country: 'Česko', genres: 'Komédia', director: 'Tomáš Svoboda' },
  { title: 'V srdci divočiny', releaseDate: '2026-09-24', year: '2026', country: 'USA', genres: 'Akčný, Dobrodružný, Dráma', director: 'David Ayer' },
  { title: 'Zapomenutý ostrov', releaseDate: '2026-09-24', year: '2026', country: 'USA', genres: 'Animovaný, Dobrodružný, Rodinný', director: 'Joel Crawford, Januel Mercado' },
  { title: 'Bára Basiková', releaseDate: '2026-09-17', year: '2026', country: 'Česko', genres: 'Dokumentárny', director: 'Helena Třeštíková' },
  { title: 'Call', releaseDate: '2026-09-17', year: '2026', country: 'Česko', genres: 'Psychologický, Thriller, Dráma', director: 'Matěj Balcar' },
  { title: 'Coyote vs. Acme', releaseDate: '2026-09-17', year: '2026', country: 'USA', genres: 'Akčný, Dobrodružný, Komédia', director: 'Dave Green' },
  { title: 'Krátký film o lásce', releaseDate: '2026-09-17', year: '1988', country: 'Poľsko', genres: 'Dráma, Romantický', director: 'Krzysztof Kieślowski' },
  { title: 'Milovník, ne bojovník', releaseDate: '2026-09-17', year: '2026', country: 'Slovensko / Česko', genres: 'Romantický, Komédia, Dráma', director: 'Martina Buchelová' },
  { title: 'Opuštěný', releaseDate: '2026-09-17', year: '2026', country: 'Francúzsko', genres: 'Dráma', director: 'Vincent Garenq' },
  { title: 'Poeta', releaseDate: '2026-09-17', year: '2025', country: 'Kolumbia / Nemecko / Švédsko', genres: 'Dráma, Komédia', director: 'Simón Mesa Soto' },
  { title: 'Resident Evil', releaseDate: '2026-09-17', year: '2026', country: 'USA', genres: 'Horor, Sci-Fi, Akčný', director: 'Zach Cregger' },
  { title: 'Rose', releaseDate: '2026-09-17', year: '2026', country: 'Rakúsko / Nemecko', genres: 'Dráma, Historický', director: 'Markus Schleinzer' },
  { title: 'Dívka v oblacích', releaseDate: '2026-09-10', year: '2026', country: 'Francúzsko / Belgicko', genres: 'Animovaný, Dobrodružný, Rodinný', director: 'Philippe Riche' },
  { title: 'Gourou', releaseDate: '2026-09-10', year: '2025', country: 'Francúzsko', genres: 'Thriller', director: 'Yann Gozlan' },
  { title: 'Hope', releaseDate: '2026-09-10', year: '2026', country: 'Južná Kórea', genres: 'Akčný, Sci-Fi, Thriller', director: 'Hong-džin Na' },
  { title: 'Léčivé účinky sebeklamu', releaseDate: '2026-09-10', year: '2026', country: 'Česko', genres: 'Komédia, Dráma', director: 'Adolf Zika' },
  { title: 'Magická posedlost 2', releaseDate: '2026-09-10', year: '2026', country: 'USA', genres: 'Komédia, Fantasy, Dráma', director: 'Susanne Bier' },
  { title: "Oasis: Don't Look Back in Anger", releaseDate: '2026-09-10', year: '2026', country: 'Veľká Británia', genres: 'Dokumentárny, Hudobný', director: 'Steven Knight, Will Lovelace' },
  { title: 'Tahle země není pro slimáky', releaseDate: '2026-09-10', year: '2026', country: 'Česko / Francúzsko / Švajčiarsko', genres: 'Animovaný, Dráma, Poviedkový', director: 'Éric Briche, Aline Höchli' },
  { title: 'Tony', releaseDate: '2026-09-10', year: '2026', country: 'USA', genres: 'Dráma, Komédia, Životopisný', director: 'Matt Johnson' },
  { title: '33 kroků', releaseDate: '2026-09-03', year: '2026', country: 'Slovensko / Česko', genres: 'Dráma', director: 'Šimon Domček, Anna Domček' },
  { title: 'Auta', releaseDate: '2026-09-03', year: '2006', country: 'USA', genres: 'Animovaný, Komédia, Rodinný', director: 'John Lasseter, Joe Ranft' },
  { title: 'Dokonalý den', releaseDate: '2026-09-03', year: '2026', country: 'Česko', genres: 'Romantický, Komédia', director: 'Jiří Matoušek' },
  { title: 'Kinotaj', releaseDate: '2026-09-03', year: '2026', country: 'Česko / Švajčiarsko', genres: 'Animovaný, Rodinný, Poviedkový', director: 'Živa Divjak, Philippe Kastner' },
  { title: 'Osm nohou a milion followerů', releaseDate: '2026-09-03', year: '2026', country: 'Veľká Británia', genres: 'Horor, Komédia', director: 'Christopher Smith' },
  { title: 'Samuraj a vězeň', releaseDate: '2026-09-03', year: '2026', country: 'Japonsko', genres: 'Historický, Dráma', director: 'Kijoši Kurosawa' },
  { title: 'Sex a smrt v kempu Miasma', releaseDate: '2026-09-03', year: '2026', country: 'USA / Veľká Británia / Kanada', genres: 'Horor, Komédia, Dráma', director: 'Jane Schoenbrun' },
  { title: 'Zápas století', releaseDate: '2026-09-03', year: '2026', country: 'Argentína / Španielsko', genres: 'Dokumentárny, Športový', director: 'Juan Cabral, Santiago Franco' },
  { title: 'Katy Perry: The Lifetimes Tour - Live from Paris', releaseDate: '2026-09-02', year: '2026', country: 'USA', genres: 'Dokumentárny, Hudobný', director: 'Paul Dugdale' }
];

async function seedPremieres() {
  const count = await prisma.premiere.count();
  if (count > 0) {
    console.log('Premiéry už existujú, preskakujem.');
    return;
  }
  await prisma.premiere.createMany({
    data: PREMIERES.map((p) => ({ ...p, releaseDate: new Date(p.releaseDate) }))
  });
  console.log(`Pridaných ${PREMIERES.length} premiér.`);
}

async function main() {
  await seedAdmin();
  await seedPremieres();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
