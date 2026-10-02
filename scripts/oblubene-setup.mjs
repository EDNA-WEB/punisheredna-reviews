// Jednorazová úprava pre „Oblíbené mezi fanoušky“:
//  1) prisma/schema.prisma — nový model FanFavorite + väzba v Movie
//  2) lib/translationRegistryCs.ts — české texty sekcie
//  3) components/admin/adminNav.ts — položka v menu administrácie
// Dá sa spustiť opakovane: čo už v súboroch je, sa znova nepridá.
import fs from 'node:fs';

function patchSchema() {
  const p = 'prisma/schema.prisma';
  let s = fs.readFileSync(p, 'utf8');
  const nl = s.includes('\r\n') ? '\r\n' : '\n';
  // Model FanFavorite — vždy v aktuálnej podobe (staršia verzia sa nahradí).
  s = s.replace(/\r?\n*^model FanFavorite \{[\s\S]*?^\}\r?\n?/m, nl);
  s = s.trimEnd() + nl + nl + [
    'model FanFavorite {',
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
  const re = /(^model Movie \{[^\n]*\n)([\s\S]*?)(^\})/m;
  const m = s.match(re);
  if (!m) throw new Error('V schema.prisma chýba model Movie');
  if (!/^\s+fanFavorites\s+FanFavorite\[\]/m.test(m[2])) {
    s = s.replace(re, (_, a, b, c) => `${a}  fanFavorites FanFavorite[]${nl}${b}${c}`);
  }
  fs.writeFileSync(p, s);
  console.log('OK  prisma/schema.prisma');
}

function patchCs() {
  const p = 'lib/translationRegistryCs.ts';
  let s = fs.readFileSync(p, 'utf8');
  const nl = s.includes('\r\n') ? '\r\n' : '\n';
  const add = {
    "home.oblubene_fanusikovia": "Oblíbené mezi fanoušky",
    "home.oblubene_popis": "Co tento týden nejvíc zajímá diváky",
    "home.posunut_vlavo": "Posunout doleva",
    "home.posunut_vpravo": "Posunout doprava",
    "home.ohodnotit_film": "Ohodnotit film",
    "home.trailer": "Trailer",
    "home.zavriet": "Zavřít",
    "home.ohodnot": "Ohodnoť",
    "home.z_5": "z 5",
    "home.hodnotenie_napoveda": "Polovinu hvězdy získáš kliknutím na její levou část",
    "home.hodnotenie_chyba": "Hodnocení se nepodařilo uložit.",
    "home.ulozit_hodnotenie": "Uložit hodnocení",
    "home.napisat_recenziu": "Napsat recenzi",
    "home.odstranit_hodnotenie": "Odstranit hodnocení",
    "fans.zobrazit_vsetky": "Zobrazit všechny",
    "fans.vsetko": "Vše",
    "fans.filmy": "Filmy",
    "fans.serialy": "Seriály",
    "fans.spat": "Hlavní stránka",
    "fans.aktualizovane": "Aktualizováno",
    "fans.prazdne": "Zatím tu nic není."
  };
  const missing = Object.entries(add).filter(([k]) => !s.includes(`'${k}'`) && !s.includes(`"${k}"`));
  if (!missing.length) return console.log('OK  lib/translationRegistryCs.ts (už obsahuje)');
  const decl = s.search(/REGISTRY_CS\b[^=]*=/);
  if (decl < 0) throw new Error('V translationRegistryCs.ts sa nenašiel REGISTRY_CS');
  const open = s.indexOf('{', s.indexOf('=', decl));
  let depth = 0, end = -1, q = null;
  for (let i = open; i < s.length; i++) {
    const ch = s[i];
    if (q) { if (ch === '\\') i++; else if (ch === q) q = null; continue; }
    if (ch === "'" || ch === '"' || ch === '`') { q = ch; continue; }
    if (ch === '/' && s[i + 1] === '/') { i = s.indexOf('\n', i); if (i < 0) break; continue; }
    if (ch === '{') depth++;
    else if (ch === '}' && --depth === 0) { end = i; break; }
  }
  if (end < 0) throw new Error('V translationRegistryCs.ts sa nenašiel koniec REGISTRY_CS');
  let before = s.slice(0, end).replace(/\s+$/, '');
  if (!before.endsWith(',') && !before.endsWith('{')) before += ',';
  const lines = missing.map(([k, v]) => `  '${k}': '${v}'`).join(',' + nl);
  s = before + nl + lines + nl + s.slice(end);
  fs.writeFileSync(p, s);
  console.log('OK  lib/translationRegistryCs.ts');
}

function patchAdminNav() {
  const p = ['components/admin/adminNav.ts', 'components/admin/adminNav.tsx'].find((f) => fs.existsSync(f));
  if (!p) return console.log('POZOR: components/admin/adminNav.ts sa nenašiel — stránka je dostupná na /admin/oblubene');
  let s = fs.readFileSync(p, 'utf8');
  if (s.includes("'/admin/oblubene'")) return console.log(`OK  ${p} (už obsahuje)`);
  const lines = s.split(/\r?\n/);
  const nl = s.includes('\r\n') ? '\r\n' : '\n';
  const idx = lines.findIndex((l) => l.includes("'/admin/sdileni'") && l.includes('{') && l.includes('}'));
  if (idx < 0) return console.log(`POZOR: v ${p} som nenašiel položku Sdílení článků — stránka je dostupná na /admin/oblubene`);
  let line = lines[idx].replace("'/admin/sdileni'", "'/admin/oblubene'").replace(/label:\s*'[^']*'/, "label: 'Oblíbené mezi fanoušky'");
  if (!line.trimEnd().endsWith(',')) lines[idx] = lines[idx].trimEnd() + ',';
  lines.splice(idx + 1, 0, line);
  fs.writeFileSync(p, lines.join(nl));
  console.log(`OK  ${p}`);
}

patchSchema();
patchCs();
patchAdminNav();
