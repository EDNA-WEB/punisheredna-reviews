// Jednorazová úprava pre „Nedávno prohlížené“:
//  1) prisma/schema.prisma — nový model RecentlyViewed + väzby v User a Movie
//  2) lib/translationRegistryCs.ts — české texty novej sekcie
// Dá sa spustiť opakovane: čo už v súboroch je, sa znova nepridá.
import fs from 'node:fs';

function patchSchema() {
  const p = 'prisma/schema.prisma';
  let s = fs.readFileSync(p, 'utf8');
  const nl = s.includes('\r\n') ? '\r\n' : '\n';
  if (!/^model RecentlyViewed \{/m.test(s)) {
    s = s.trimEnd() + nl + nl + [
      'model RecentlyViewed {',
      '  id       String   @id @default(cuid())',
      '  userId   String',
      '  movieId  String',
      '  viewedAt DateTime @default(now())',
      '  user     User     @relation(fields: [userId], references: [id], onDelete: Cascade)',
      '  movie    Movie    @relation(fields: [movieId], references: [id], onDelete: Cascade)',
      '',
      '  @@unique([userId, movieId])',
      '  @@index([userId, viewedAt])',
      '}'
    ].join(nl) + nl;
  }
  for (const model of ['User', 'Movie']) {
    const re = new RegExp(`(^model ${model} \\{[^\\n]*\\n)([\\s\\S]*?)(^\\})`, 'm');
    const m = s.match(re);
    if (!m) throw new Error(`V schema.prisma chýba model ${model}`);
    if (!/^\s+recentlyViewed\s+RecentlyViewed\[\]/m.test(m[2])) {
      s = s.replace(re, (_, a, b, c) => `${a}  recentlyViewed RecentlyViewed[]${nl}${b}${c}`);
    }
  }
  fs.writeFileSync(p, s);
  console.log('OK  prisma/schema.prisma');
}

function patchCs() {
  const p = 'lib/translationRegistryCs.ts';
  let s = fs.readFileSync(p, 'utf8');
  const nl = s.includes('\r\n') ? '\r\n' : '\n';
  const add = {
    'home.nedavno_prezerane': 'Nedávno prohlížené',
    'home.vymazat_vsetko': 'Vymazat vše',
    'home.pridat_chcem_vidiet': 'Přidat do Chci vidět',
    'home.odobrat_chcem_vidiet': 'Odebrat z Chci vidět'
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

patchSchema();
patchCs();
