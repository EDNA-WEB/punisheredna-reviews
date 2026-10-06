// Jednorazová úprava pre „Top 10 tento týden“:
//  1) prisma/schema.prisma — modely Top10Entry a SeenMovie (+ väzby v User a Movie)
//  2) app/page.tsx — „Naposledy přidané“ nahradí sekcia Top 10
//  3) lib/translationRegistry.ts + lib/translationRegistryCs.ts — texty sekcie
// Dá sa spustiť opakovane.
import fs from 'node:fs';

const ENTRIES = [
  { key: 'top10.nadpis', sk: 'Top 10 tento týždeň', cs: 'Top 10 tento týden' },
  { key: 'top10.popis', sk: 'Čo tento týždeň najviac sledujú diváci', cs: 'Co tento týden nejvíc sledují diváci' },
  { key: 'top10.ohodnotit', sk: 'Ohodnotiť', cs: 'Ohodnotit' },
  { key: 'top10.videl_som', sk: 'Videl som', cs: 'Viděl jsem' },
  { key: 'top10.videl', sk: 'Videné', cs: 'Viděno' },
  { key: 'top10.videny_hodnotenim', sk: 'Ohodnotený film je označený ako videný', cs: 'Ohodnocený film je označený jako viděný' }
];
let problems = 0;
const nlOf = (s) => (s.includes('\r\n') ? '\r\n' : '\n');

function addRelation(s, model, line) {
  const nl = nlOf(s);
  const re = new RegExp(`(^model ${model} \\{[^\\n]*\\n)([\\s\\S]*?)(^\\})`, 'm');
  const m = s.match(re);
  if (!m) throw new Error(`V schema.prisma chýba model ${model}`);
  const field = line.trim().split(/\s+/)[0];
  if (new RegExp(`^\\s+${field}\\s`, 'm').test(m[2])) return s;
  return s.replace(re, (_, a, b, c) => `${a}  ${line}${nl}${b}${c}`);
}

function patchSchema() {
  const p = 'prisma/schema.prisma';
  let s = fs.readFileSync(p, 'utf8');
  const nl = nlOf(s);
  if (!/^model Top10Entry \{/m.test(s)) {
    s = s.trimEnd() + nl + nl + [
      'model Top10Entry {',
      '  id          String   @id @default(cuid())',
      '  rank        Int',
      '  sourceId    String   @unique',
      '  title       String',
      '  year        Int?',
      '  tmdbId      Int?',
      '  mediaType   String?',
      '  movieId     String?',
      '  movie       Movie?   @relation(fields: [movieId], references: [id], onDelete: SetNull)',
      '  importError String?',
      '  updatedAt   DateTime @default(now())',
      '',
      '  @@index([rank])',
      '}'
    ].join(nl) + nl;
  }
  if (!/^model SeenMovie \{/m.test(s)) {
    s = s.trimEnd() + nl + nl + [
      'model SeenMovie {',
      '  id        String   @id @default(cuid())',
      '  userId    String',
      '  movieId   String',
      '  createdAt DateTime @default(now())',
      '  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)',
      '  movie     Movie    @relation(fields: [movieId], references: [id], onDelete: Cascade)',
      '',
      '  @@unique([userId, movieId])',
      '  @@index([movieId])',
      '}'
    ].join(nl) + nl;
  }
  s = addRelation(s, 'Movie', 'top10Entries Top10Entry[]');
  s = addRelation(s, 'Movie', 'seenBy SeenMovie[]');
  s = addRelation(s, 'User', 'seenMovies SeenMovie[]');
  fs.writeFileSync(p, s);
  console.log(`OK  ${p}`);
}

function patchHome() {
  const p = 'app/page.tsx';
  let s = fs.readFileSync(p, 'utf8');
  if (s.includes('<Top10Home')) return console.log(`OK  ${p} (už obsahuje)`);
  const t = s.indexOf("title={t('home.naposledy_pridane')}");
  const start = t >= 0 ? s.lastIndexOf('<MovieMiniList', t) : -1;
  const end = t >= 0 ? s.indexOf('/>', t) : -1;
  if (t < 0 || start < 0 || end < 0) {
    problems++;
    return console.log(`POZOR: v ${p} som nenašiel sekciu „Naposledy přidané“ — pošli mi tento súbor.`);
  }
  s = s.slice(0, start) + '<Top10Home viewerId={viewerId} />' + s.slice(end + 2);
  const nl = nlOf(s);
  const firstImport = s.indexOf('import ');
  s = s.slice(0, firstImport) + "import Top10Home from '@/components/Top10Home';" + nl + s.slice(firstImport);
  fs.writeFileSync(p, s);
  console.log(`OK  ${p}`);
}

function endOfBlock(s, start, open, close) {
  let depth = 0, q = null;
  for (let i = start; i < s.length; i++) {
    const ch = s[i];
    if (q) { if (ch === '\\') i++; else if (ch === q) q = null; continue; }
    if (ch === "'" || ch === '"' || ch === '`') { q = ch; continue; }
    if (ch === '/' && s[i + 1] === '/') { i = s.indexOf('\n', i); if (i < 0) break; continue; }
    if (ch === open) depth++;
    else if (ch === close && --depth === 0) return i;
  }
  return -1;
}
const esc = (t) => t.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
function insertBefore(s, end, items) {
  const nl = nlOf(s);
  let before = s.slice(0, end).replace(/\s+$/, '');
  if (!before.endsWith(',') && !/[\[{]$/.test(before)) before += ',';
  return before + nl + items.join(',' + nl) + nl + s.slice(end);
}
function patchRegistry() {
  const p = 'lib/translationRegistry.ts';
  let s = fs.readFileSync(p, 'utf8');
  const missing = ENTRIES.filter((e) => !s.includes(`'${e.key}'`));
  if (!missing.length) return console.log(`OK  ${p} (už obsahuje)`);
  const open = s.indexOf('[', s.indexOf('=', s.indexOf('TRANSLATION_REGISTRY')));
  const end = endOfBlock(s, open, '[', ']');
  if (end < 0) throw new Error('V translationRegistry.ts sa nenašiel koniec zoznamu');
  s = insertBefore(s, end, missing.map((e) => `  { key: '${e.key}', group: 'Hlavná stránka', sk: '${esc(e.sk)}' }`));
  fs.writeFileSync(p, s);
  console.log(`OK  ${p}`);
}
function patchCs() {
  const p = 'lib/translationRegistryCs.ts';
  let s = fs.readFileSync(p, 'utf8');
  const missing = ENTRIES.filter((e) => !s.includes(`'${e.key}'`) && !s.includes(`"${e.key}"`));
  if (!missing.length) return console.log(`OK  ${p} (už obsahuje)`);
  const open = s.indexOf('{', s.indexOf('=', s.search(/REGISTRY_CS\b[^=]*=/)));
  const end = endOfBlock(s, open, '{', '}');
  if (end < 0) throw new Error('V translationRegistryCs.ts sa nenašiel koniec REGISTRY_CS');
  s = insertBefore(s, end, missing.map((e) => `  '${e.key}': '${esc(e.cs)}'`));
  fs.writeFileSync(p, s);
  console.log(`OK  ${p}`);
}

patchSchema();
patchHome();
patchRegistry();
patchCs();
if (problems) console.log(`\n${problems}x POZOR — pozri riadky vyššie.`);
