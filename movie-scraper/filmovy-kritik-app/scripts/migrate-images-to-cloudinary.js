// Jednorazový migračný skript — prejde CELÚ databázu, nájde všetky obrázky,
// čo sú ešte uložené postaru priamo v databáze (ako dlhý text "data:image/..."),
// nahrá ich na Cloudinary, a v databáze nahradí len ich krátkou adresou.
//
// Spustenie:  node scripts/migrate-images-to-cloudinary.js
//
// Bezpečné spustiť viackrát za sebou — čo je už na Cloudinary (začína na
// "https://"), sa jednoducho preskočí, nenahráva sa druhýkrát.

// --- Ručné načítanie .env súboru (bez závislosti na balíku "dotenv") ---
const fs = require('fs');
const path = require('path');
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) {
    console.error('Nenašiel som .env súbor v koreňovom priečinku projektu.');
    process.exit(1);
  }
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) return;
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  });
}
loadEnv();

if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  console.error('Chýbajú CLOUDINARY_* premenné v .env súbore. Skontroluj ich prosím a skús znova.');
  process.exit(1);
}

const { PrismaClient } = require('@prisma/client');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

const prisma = new PrismaClient();

const BATCH_SIZE = 20;
const DELAY_MS = 150; // malá pauza medzi nahrávaniami, nech sa nezahltí Cloudinary

let totalMigrated = 0;
let totalFailed = 0;
let totalSkipped = 0;

function isBase64Image(value) {
  return typeof value === 'string' && value.startsWith('data:image');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function uploadOne(dataUrl, folder) {
  const result = await cloudinary.uploader.upload(dataUrl, {
    folder: `punisheredna/${folder}`,
    resource_type: 'image'
  });
  return result.secure_url;
}

function cloudinaryThumbnailUrl(url, width = 300) {
  if (!url || !url.includes('res.cloudinary.com') || !url.includes('/upload/')) return url;
  return url.replace('/upload/', `/upload/w_${width},c_limit,q_auto/`);
}

// Prejde JEDNO pole na JEDNOM modeli, po dávkach, kým nezostanú žiadne base64 záznamy.
async function migrateSimpleField(label, findMany, updateOne, field, folder) {
  console.log(`\n--- ${label} ---`);
  let migratedHere = 0;
  while (true) {
    const rows = await findMany(BATCH_SIZE);
    const toMigrate = rows.filter((r) => isBase64Image(r[field]));
    if (toMigrate.length === 0) break;

    for (const row of toMigrate) {
      try {
        const url = await uploadOne(row[field], folder);
        await updateOne(row.id, url);
        migratedHere++;
        totalMigrated++;
        console.log(`  ✓ ${row.id} nahraté`);
      } catch (err) {
        totalFailed++;
        console.error(`  ✗ ${row.id} ZLYHALO: ${err.message || err}`);
      }
      await sleep(DELAY_MS);
    }
  }
  if (migratedHere === 0) console.log('  (nič na migráciu, všetko je už na Cloudinary)');
  else console.log(`  Spolu presunuté v tejto tabuľke: ${migratedHere}`);
}

async function migrateMoviePhotos() {
  console.log('\n--- Galéria filmov a epizód (MoviePhoto) ---');
  let migratedHere = 0;
  while (true) {
    const rows = await prisma.moviePhoto.findMany({
      where: { OR: [{ full: { startsWith: 'data:image' } }, { thumbnail: { startsWith: 'data:image' } }] },
      take: BATCH_SIZE,
      select: { id: true, thumbnail: true, full: true }
    });
    if (rows.length === 0) break;

    for (const row of rows) {
      try {
        // Ak je "full" ešte base64, nahráme ho a miniatúru odvodíme z neho.
        // Ak "full" už je na Cloudinary (napr. z predošlého čiastočného behu),
        // len ho použijeme na odvodenie novej miniatúry namiesto nahrávania
        // starej base64 miniatúry.
        const fullUrl = isBase64Image(row.full) ? await uploadOne(row.full, 'movies/gallery') : row.full;
        const thumbnailUrl = cloudinaryThumbnailUrl(fullUrl, 300);
        await prisma.moviePhoto.update({ where: { id: row.id }, data: { full: fullUrl, thumbnail: thumbnailUrl } });
        migratedHere++;
        totalMigrated++;
        console.log(`  ✓ ${row.id} nahraté`);
      } catch (err) {
        totalFailed++;
        console.error(`  ✗ ${row.id} ZLYHALO: ${err.message || err}`);
      }
      await sleep(DELAY_MS);
    }
  }
  if (migratedHere === 0) console.log('  (nič na migráciu, všetko je už na Cloudinary)');
  else console.log(`  Spolu presunuté v tejto tabuľke: ${migratedHere}`);
}

async function main() {
  console.log('Spúšťam migráciu obrázkov do Cloudinary...');
  console.log('Toto môže chvíľu trvať, podľa toho, koľko obrázkov ešte treba presunúť.\n');

  await migrateSimpleField(
    'Avatary používateľov (User.avatar)',
    (take) => prisma.user.findMany({ where: { avatar: { startsWith: 'data:image' } }, take, select: { id: true, avatar: true } }),
    (id, url) => prisma.user.update({ where: { id }, data: { avatar: url } }),
    'avatar',
    'avatars'
  );

  await migrateSimpleField(
    'Fotky osobností (Person.photo)',
    (take) => prisma.person.findMany({ where: { photo: { startsWith: 'data:image' } }, take, select: { id: true, photo: true } }),
    (id, url) => prisma.person.update({ where: { id }, data: { photo: url } }),
    'photo',
    'people'
  );

  await migrateSimpleField(
    'Plagáty filmov (Movie.poster)',
    (take) => prisma.movie.findMany({ where: { poster: { startsWith: 'data:image' } }, take, select: { id: true, poster: true } }),
    (id, url) => prisma.movie.update({ where: { id }, data: { poster: url } }),
    'poster',
    'movies/posters'
  );

  await migrateSimpleField(
    'Online náhľady filmov (Movie.onlineImage)',
    (take) => prisma.movie.findMany({ where: { onlineImage: { startsWith: 'data:image' } }, take, select: { id: true, onlineImage: true } }),
    (id, url) => prisma.movie.update({ where: { id }, data: { onlineImage: url } }),
    'onlineImage',
    'movies/online'
  );

  await migrateSimpleField(
    'Online náhľady epizód (Episode.onlineImage)',
    (take) => prisma.episode.findMany({ where: { onlineImage: { startsWith: 'data:image' } }, take, select: { id: true, onlineImage: true } }),
    (id, url) => prisma.episode.update({ where: { id }, data: { onlineImage: url } }),
    'onlineImage',
    'episodes/online'
  );

  await migrateMoviePhotos();

  await migrateSimpleField(
    'Náhľady trailerov (MovieVideo.previewImage)',
    (take) => prisma.movieVideo.findMany({ where: { previewImage: { startsWith: 'data:image' } }, take, select: { id: true, previewImage: true } }),
    (id, url) => prisma.movieVideo.update({ where: { id }, data: { previewImage: url } }),
    'previewImage',
    'videos/previews'
  );

  await migrateSimpleField(
    'Tapeta webu (Settings.wallpaper)',
    (take) => prisma.settings.findMany({ where: { wallpaper: { startsWith: 'data:image' } }, take, select: { id: true, wallpaper: true } }),
    (id, url) => prisma.settings.update({ where: { id }, data: { wallpaper: url } }),
    'wallpaper',
    'settings'
  );

  await migrateSimpleField(
    'Plagáty premiér (Premiere.poster)',
    (take) => prisma.premiere.findMany({ where: { poster: { startsWith: 'data:image' } }, take, select: { id: true, poster: true } }),
    (id, url) => prisma.premiere.update({ where: { id }, data: { poster: url } }),
    'poster',
    'premieres'
  );

  await migrateSimpleField(
    'Titulné obrázky noviniek (NewsPost.coverImage)',
    (take) => prisma.newsPost.findMany({ where: { coverImage: { startsWith: 'data:image' } }, take, select: { id: true, coverImage: true } }),
    (id, url) => prisma.newsPost.update({ where: { id }, data: { coverImage: url } }),
    'coverImage',
    'articles/news'
  );

  await migrateSimpleField(
    'Titulné obrázky blog článkov (BlogPost.coverImage)',
    (take) => prisma.blogPost.findMany({ where: { coverImage: { startsWith: 'data:image' } }, take, select: { id: true, coverImage: true } }),
    (id, url) => prisma.blogPost.update({ where: { id }, data: { coverImage: url } }),
    'coverImage',
    'articles/blog'
  );

  await migrateSimpleField(
    'Staršie verzie článkov (ArticleRevision.coverImage)',
    (take) => prisma.articleRevision.findMany({ where: { coverImage: { startsWith: 'data:image' } }, take, select: { id: true, coverImage: true } }),
    (id, url) => prisma.articleRevision.update({ where: { id }, data: { coverImage: url } }),
    'coverImage',
    'articles/revisions'
  );

  await migrateSimpleField(
    'Obrázky v správach (Message.image)',
    (take) => prisma.message.findMany({ where: { image: { startsWith: 'data:image' } }, take, select: { id: true, image: true } }),
    (id, url) => prisma.message.update({ where: { id }, data: { image: url } }),
    'image',
    'messages'
  );

  console.log('\n========================================');
  console.log(`Hotovo! Úspešne presunuté: ${totalMigrated}`);
  if (totalFailed > 0) console.log(`Zlyhalo (skús spustiť skript znova): ${totalFailed}`);
  console.log('========================================\n');

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('Migrácia zlyhala s neočakávanou chybou:', err);
  await prisma.$disconnect();
  process.exit(1);
});
