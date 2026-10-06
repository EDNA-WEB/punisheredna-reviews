// Jednorazová úprava pre e-maily (overenie, obnovenie hesla, oznámenia):
//  1) prisma/schema.prisma — nové polia v User, Movie, NewsPost + model EmailThrottle
//  2) app/api/mobile/login/route.ts — neoverený nový účet sa v appke neprihlási
//  3) lib/translationRegistry.ts + lib/translationRegistryCs.ts — texty nových stránok
// Dá sa spustiť opakovane: čo už v súboroch je, sa znova nepridá.
import fs from 'node:fs';

const ENTRIES = [
  {
    "key": "email.chyba_odoslania",
    "sk": "E-mail sa nepodarilo odoslať. Skús to prosím znova.",
    "cs": "E-mail se nepodařilo odeslat. Zkus to prosím znovu."
  },
  {
    "key": "email.hesla_nezhoda",
    "sk": "Heslá sa nezhodujú.",
    "cs": "Hesla se neshodují."
  },
  {
    "key": "email.heslo_8",
    "sk": "aspoň 8 znakov",
    "cs": "alespoň 8 znaků"
  },
  {
    "key": "email.heslo_chyba",
    "sk": "Heslo sa nepodarilo uložiť.",
    "cs": "Heslo se nepodařilo uložit."
  },
  {
    "key": "email.heslo_cislo",
    "sk": "číslicu",
    "cs": "číslici"
  },
  {
    "key": "email.heslo_male",
    "sk": "malé písmeno",
    "cs": "malé písmeno"
  },
  {
    "key": "email.heslo_poziadavky",
    "sk": "Heslo nespĺňa všetky požiadavky.",
    "cs": "Heslo nesplňuje všechny požadavky."
  },
  {
    "key": "email.heslo_velke",
    "sk": "veľké písmeno",
    "cs": "velké písmeno"
  },
  {
    "key": "email.nove_heslo",
    "sk": "Nové heslo",
    "cs": "Nové heslo"
  },
  {
    "key": "email.odkaz_odoslany",
    "sk": "Nový odkaz je na ceste.",
    "cs": "Nový odkaz je na cestě."
  },
  {
    "key": "email.overeny_nadpis",
    "sk": "E-mail overený",
    "cs": "E-mail ověřen"
  },
  {
    "key": "email.overeny_text",
    "sk": "Účet je aktívny. Vitaj na KrálFilmu.cz.",
    "cs": "Účet je aktivní. Vítej na KrálFilmu.cz."
  },
  {
    "key": "email.poslali_sme_na",
    "sk": "Na",
    "cs": "Na"
  },
  {
    "key": "email.poslali_sme_text",
    "sk": "sme poslali odkaz na potvrdenie účtu. Prihlásiť sa bude dať až po kliknutí naň.",
    "cs": "jsme poslali odkaz pro potvrzení účtu. Přihlásit se půjde až po kliknutí na něj."
  },
  {
    "key": "email.poslat_odkaz_znova",
    "sk": "Poslať odkaz znova",
    "cs": "Poslat odkaz znovu"
  },
  {
    "key": "email.skontroluj_nadpis",
    "sk": "Skontroluj svoj e-mail",
    "cs": "Zkontroluj svůj e-mail"
  },
  {
    "key": "email.skontroluj_spam",
    "sk": "Nič neprišlo? Pozri sa aj do priečinka Spam.",
    "cs": "Nic nepřišlo? Podívej se i do složky Spam."
  },
  {
    "key": "email.spat_na_prihlasenie",
    "sk": "Späť na prihlásenie",
    "cs": "Zpět na přihlášení"
  },
  {
    "key": "email.ukladam",
    "sk": "Ukladám…",
    "cs": "Ukládám…"
  },
  {
    "key": "email.ulozit_heslo",
    "sk": "Uložiť heslo",
    "cs": "Uložit heslo"
  },
  {
    "key": "email.uz_overeny",
    "sk": "Tento e-mail už je overený.",
    "cs": "Tento e-mail už je ověřený."
  },
  {
    "key": "email.vyprsal_nadpis",
    "sk": "Odkaz vypršal",
    "cs": "Odkaz vypršel"
  },
  {
    "key": "email.vyprsal_prihlas",
    "sk": "Nový odkaz si pošleš pri pokuse o prihlásenie.",
    "cs": "Nový odkaz si pošleš při pokusu o přihlášení."
  },
  {
    "key": "email.vyprsal_text",
    "sk": "Tento odkaz už neplatí alebo bol použitý. Pošli si nový, zaberie to pár sekúnd.",
    "cs": "Tento odkaz už neplatí nebo byl použit. Pošli si nový, zabere to pár vteřin."
  },
  {
    "key": "email.znova_za",
    "sk": "Znova poslať pôjde o",
    "cs": "Znovu poslat půjde za"
  },
  {
    "key": "email.zopakuj_heslo",
    "sk": "Zopakuj nové heslo",
    "cs": "Zopakuj nové heslo"
  },
  {
    "key": "emailpref.chyba_nacitania",
    "sk": "Nastavenia sa nepodarilo načítať.",
    "cs": "Nastavení se nepodařilo načíst."
  },
  {
    "key": "emailpref.chyba_ulozenia",
    "sk": "Zmenu sa nepodarilo uložiť.",
    "cs": "Změnu se nepodařilo uložit."
  },
  {
    "key": "emailpref.messages",
    "sk": "Nová správa v pošte",
    "cs": "Nová zpráva v poště"
  },
  {
    "key": "emailpref.messages_hint",
    "sk": "Keď ti niekto napíše a správu si do pár minút neprečítaš. Z jednej konverzácie najviac jeden e-mail za hodinu.",
    "cs": "Když ti někdo napíše a zprávu si do pár minut nepřečteš. Z jedné konverzace nejvýš jeden e-mail za hodinu."
  },
  {
    "key": "emailpref.nadpis",
    "sk": "E-mailové oznámenia",
    "cs": "E-mailová oznámení"
  },
  {
    "key": "emailpref.nastavenia",
    "sk": "Nastavenia",
    "cs": "Nastavení"
  },
  {
    "key": "emailpref.neovereny",
    "sk": "Tvoj e-mail ešte nie je overený, oznámenia ti preto zatiaľ nechodia.",
    "cs": "Tvůj e-mail ještě není ověřený, oznámení ti proto zatím nechodí."
  },
  {
    "key": "emailpref.news",
    "sk": "Novinky z KrálFilmu",
    "cs": "Novinky z KrálFilmu"
  },
  {
    "key": "emailpref.news_hint",
    "sk": "Výber dôležitých noviniek, najviac niekoľkokrát za mesiac.",
    "cs": "Výběr důležitých novinek, nejvýš několikrát za měsíc."
  },
  {
    "key": "emailpref.online",
    "sk": "Film z Chcem vidieť alebo Obľúbených je online",
    "cs": "Film z Chci vidět nebo Oblíbených je online"
  },
  {
    "key": "emailpref.online_hint",
    "sk": "Keď filmu alebo seriálu z tvojich zoznamov pribudne online odkaz.",
    "cs": "Když filmu nebo seriálu z tvých seznamů přibude online odkaz."
  },
  {
    "key": "emailpref.overit",
    "sk": "Poslať overovací e-mail",
    "cs": "Poslat ověřovací e-mail"
  },
  {
    "key": "emailpref.posielame_na",
    "sk": "Posielame na",
    "cs": "Posíláme na"
  },
  {
    "key": "emailpref.ucet_vzdy",
    "sk": "E-maily k účtu (overenie, obnovenie hesla) chodia vždy.",
    "cs": "E-maily k účtu (ověření, obnovení hesla) chodí vždy."
  },
  {
    "key": "emailpref.vypnut_vsetko",
    "sk": "Vypnúť všetky",
    "cs": "Vypnout všechny"
  },
  {
    "key": "emailpref.zvoncek",
    "sk": "Oznámenia na webe (zvonček v navigácii) sú aktívne automaticky — odpovede na komentáre, nové sledovanie a podobne.",
    "cs": "Oznámení na webu (zvoneček v navigaci) jsou aktivní automaticky — odpovědi na komentáře, nové sledování a podobně."
  },
  {
    "key": "reset.bezpecnost",
    "sk": "Z bezpečnostných dôvodov nepíšeme, či je e-mail u nás registrovaný.",
    "cs": "Z bezpečnostních důvodů nepíšeme, jestli je e-mail u nás registrovaný."
  },
  {
    "key": "reset.hotovo",
    "sk": "Heslo je zmenené. Zo všetkých zariadení sme ťa odhlásili, prihlás sa novým heslom.",
    "cs": "Heslo je změněné. Ze všech zařízení jsme tě odhlásili, přihlas se novým heslem."
  },
  {
    "key": "reset.mam_kod",
    "sk": "Mám bezpečnostný kód",
    "cs": "Mám bezpečnostní kód"
  },
  {
    "key": "reset.nadpis",
    "sk": "Zabudnuté heslo",
    "cs": "Zapomenuté heslo"
  },
  {
    "key": "reset.novy_odkaz",
    "sk": "Poslať nový odkaz",
    "cs": "Poslat nový odkaz"
  },
  {
    "key": "reset.odhlasenie",
    "sk": "Po uložení ťa odhlásime zo všetkých zariadení.",
    "cs": "Po uložení tě odhlásíme ze všech zařízení."
  },
  {
    "key": "reset.odoslane",
    "sk": "Ak k tejto adrese existuje účet, poslali sme na ňu odkaz na nastavenie nového hesla. Odkaz platí 1 hodinu.",
    "cs": "Pokud k této adrese existuje účet, poslali jsme na ni odkaz pro nastavení nového hesla. Odkaz platí 1 hodinu."
  },
  {
    "key": "reset.popis",
    "sk": "Zadaj e-mail, s ktorým si sa registroval. Pošleme ti odkaz na nastavenie nového hesla.",
    "cs": "Zadej e-mail, se kterým ses registroval. Pošleme ti odkaz na nastavení nového hesla."
  },
  {
    "key": "reset.poslat_odkaz",
    "sk": "Poslať odkaz",
    "cs": "Poslat odkaz"
  },
  {
    "key": "reset.ucet",
    "sk": "Účet",
    "cs": "Účet"
  },
  {
    "key": "reset.vyprsal",
    "sk": "Odkaz na nové heslo už neplatí alebo bol použitý. Požiadaj o nový.",
    "cs": "Odkaz na nové heslo už neplatí nebo byl použit. Požádej si o nový."
  },
  {
    "key": "unsub.all",
    "sk": "Všetky e-mailové oznámenia",
    "cs": "Všechna e-mailová oznámení"
  },
  {
    "key": "unsub.chyba",
    "sk": "Odkaz je neplatný. Odber môžeš vypnúť v Nastavenia → Oznámenia.",
    "cs": "Odkaz je neplatný. Odběr můžeš vypnout v Nastavení → Oznámení."
  },
  {
    "key": "unsub.hotovo",
    "sk": "Hotovo, tieto e-maily ti už chodiť nebudú.",
    "cs": "Hotovo, tyto e-maily ti už chodit nebudou."
  },
  {
    "key": "unsub.messages",
    "sk": "Nová správa v pošte",
    "cs": "Nová zpráva v poště"
  },
  {
    "key": "unsub.nadpis",
    "sk": "Odhlásiť odber",
    "cs": "Odhlásit odběr"
  },
  {
    "key": "unsub.nastavenia",
    "sk": "Nastavenia oznámení",
    "cs": "Nastavení oznámení"
  },
  {
    "key": "unsub.neplatny",
    "sk": "Neplatný odkaz",
    "cs": "Neplatný odkaz"
  },
  {
    "key": "unsub.news",
    "sk": "Novinky z KrálFilmu",
    "cs": "Novinky z KrálFilmu"
  },
  {
    "key": "unsub.online",
    "sk": "Film z Chcem vidieť alebo Obľúbených je online",
    "cs": "Film z Chci vidět nebo Oblíbených je online"
  },
  {
    "key": "unsub.potvrdit",
    "sk": "Odhlásiť odber",
    "cs": "Odhlásit odběr"
  },
  {
    "key": "unsub.text",
    "sk": "Prestaneme ti posielať e-maily:",
    "cs": "Přestaneme ti posílat e-maily:"
  }
];
let problems = 0;
const nlOf = (s) => (s.includes('\r\n') ? '\r\n' : '\n');

function addFields(s, model, lines) {
  const nl = nlOf(s);
  const re = new RegExp(`(^model ${model} \\{[^\\n]*\\n)([\\s\\S]*?)(^\\})`, 'm');
  const m = s.match(re);
  if (!m) throw new Error(`V schema.prisma chýba model ${model}`);
  const missing = lines.filter((l) => !new RegExp(`^\\s+${l.trim().split(/\s+/)[0]}\\s`, 'm').test(m[2]));
  if (!missing.length) return s;
  return s.replace(re, (_, a, b, c) => `${a}${missing.map((l) => '  ' + l + nl).join('')}${b}${c}`);
}

function patchSchema() {
  const p = 'prisma/schema.prisma';
  let s = fs.readFileSync(p, 'utf8');
  const nl = nlOf(s);
  s = addFields(s, 'User', [
    'mustVerifyEmail      Boolean   @default(false)',
    'verificationSentAt   DateTime?',
    'passwordResetHash    String?   @unique',
    'passwordResetExpires DateTime?',
    'passwordResetSentAt  DateTime?',
    'passwordChangedAt    DateTime?',
    'emailNews            Boolean   @default(false)',
    'emailOnline          Boolean   @default(true)',
    'emailMessages        Boolean   @default(true)'
  ]);
  s = addFields(s, 'Movie', ['onlineNotifiedAt DateTime?']);
  s = addFields(s, 'NewsPost', ['emailedAt    DateTime?', 'emailedCount Int?']);
  if (!/^model EmailThrottle \{/m.test(s)) {
    s = s.trimEnd() + nl + nl + ['model EmailThrottle {', '  key    String   @id', '  sentAt DateTime @default(now())', '', '  @@index([sentAt])', '}'].join(nl) + nl;
  }
  fs.writeFileSync(p, s);
  console.log('OK  prisma/schema.prisma');
}

function patchMobileLogin() {
  const p = 'app/api/mobile/login/route.ts';
  if (!fs.existsSync(p)) {
    problems++;
    return console.log(`POZOR: ${p} sa nenašiel — pošli mi ho, nech doplním kontrolu overenia e-mailu.`);
  }
  let s = fs.readFileSync(p, 'utf8');
  if (s.includes('EMAIL_NOT_VERIFIED')) return console.log(`OK  ${p} (už obsahuje)`);
  const nl = nlOf(s);
  const lines = s.split(/\r?\n/);
  const idx = lines.findIndex((l) => l.includes('signMobileToken('));
  const varMatch = s.match(/signMobileToken\(\s*\{\s*userId:\s*([A-Za-z_$][\w$]*)\.id/);
  if (idx < 0 || !varMatch) {
    problems++;
    return console.log(`POZOR: v ${p} som nenašiel signMobileToken({ userId: … }) — pošli mi tento súbor.`);
  }
  const v = varMatch[1];
  const indent = (lines[idx].match(/^\s*/) || [''])[0];
  const block = [
    `${indent}// Nový účet sa prihlási až po overení e-mailu (staršie účty majú mustVerifyEmail = false).`,
    `${indent}if ((${v} as any).mustVerifyEmail && !(${v} as any).emailVerified) {`,
    `${indent}  return NextResponse.json({ error: 'Účet ještě není ověřený. Klikni na odkaz v e-mailu, který jsme ti poslali.', code: 'EMAIL_NOT_VERIFIED' }, { status: 403 });`,
    `${indent}}`
  ];
  lines.splice(idx, 0, ...block);
  fs.writeFileSync(p, lines.join(nl));
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
  const decl = s.indexOf('TRANSLATION_REGISTRY');
  const open = s.indexOf('[', s.indexOf('=', decl));
  const end = endOfBlock(s, open, '[', ']');
  if (end < 0) throw new Error('V translationRegistry.ts sa nenašiel koniec zoznamu');
  s = insertBefore(s, end, missing.map((e) => `  { key: '${e.key}', group: 'E-maily a účet', sk: '${esc(e.sk)}' }`));
  fs.writeFileSync(p, s);
  console.log(`OK  ${p}`);
}

function patchCs() {
  const p = 'lib/translationRegistryCs.ts';
  let s = fs.readFileSync(p, 'utf8');
  const missing = ENTRIES.filter((e) => !s.includes(`'${e.key}'`) && !s.includes(`"${e.key}"`));
  if (!missing.length) return console.log(`OK  ${p} (už obsahuje)`);
  const decl = s.search(/REGISTRY_CS\b[^=]*=/);
  const open = s.indexOf('{', s.indexOf('=', decl));
  const end = endOfBlock(s, open, '{', '}');
  if (end < 0) throw new Error('V translationRegistryCs.ts sa nenašiel koniec REGISTRY_CS');
  s = insertBefore(s, end, missing.map((e) => `  '${e.key}': '${esc(e.cs)}'`));
  fs.writeFileSync(p, s);
  console.log(`OK  ${p}`);
}

patchSchema();
patchMobileLogin();
patchRegistry();
patchCs();
if (problems) console.log(`\n${problems}x POZOR — pozri riadky vyššie.`);
