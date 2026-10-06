// Bezpečnosť: IP záznamy pre políciu + pokusy o registráciu.
// Spustenie: node scripts\bezpecnost-setup.mjs   (dá sa spustiť opakovane)
import fs from 'node:fs';

let problems = 0;
const nlOf = (s) => (s.includes('\r\n') ? '\r\n' : '\n');
const ok = (m) => console.log(`OK     ${m}`);
const bad = (m) => {
  problems++;
  console.log(`POZOR  ${m}`);
};

function addImport(src, line) {
  if (src.includes(line)) return src;
  const nl = nlOf(src);
  const lines = src.split(/\r?\n/);
  let last = -1;
  for (let i = 0; i < lines.length; i++) if (/^import .* from ['"].+['"];?\s*$/.test(lines[i])) last = i;
  lines.splice(last + 1, 0, line);
  return lines.join(nl);
}

// 1) prisma/schema.prisma — nové modely
{
  const p = 'prisma/schema.prisma';
  let s = fs.readFileSync(p, 'utf8');
  const nl = nlOf(s);
  const models = {
    ActivityLog: [
      'model ActivityLog {',
      '  id        String   @id @default(cuid())',
      '  userId    String',
      '  action    String',
      '  targetId  String?',
      '  ip        String?',
      '  userAgent String?',
      '  createdAt DateTime @default(now())',
      '',
      '  @@index([userId, createdAt])',
      '  @@index([createdAt])',
      '}'
    ],
    RegistrationAttempt: [
      'model RegistrationAttempt {',
      '  id          String   @id @default(cuid())',
      '  source      String',
      '  result      String',
      '  emailMasked String?',
      '  emailDomain String?',
      '  ip          String?',
      '  userAgent   String?',
      '  createdAt   DateTime @default(now())',
      '',
      '  @@index([createdAt])',
      '  @@index([result, createdAt])',
      '}'
    ],
    IpLogHold: [
      'model IpLogHold {',
      '  userId    String   @id',
      '  note      String?',
      '  createdBy String',
      '  createdAt DateTime @default(now())',
      '}'
    ]
  };
  let changed = false;
  for (const [name, lines] of Object.entries(models)) {
    if (new RegExp(`^model ${name} \\{`, 'm').test(s)) continue;
    s = s.trimEnd() + nl + nl + lines.join(nl) + nl;
    changed = true;
  }
  if (changed) fs.writeFileSync(p, s);
  ok(`${p}${changed ? '' : ' (už obsahuje)'}`);
}

// 2) Menu administrácie — „Bezpečnost“
{
  const np = ['components/admin/adminNav.ts', 'components/admin/adminNav.tsx'].find((f) => fs.existsSync(f));
  if (!np) bad('menu administrácie sa nenašlo — stránka je dostupná na /admin/bezpecnost');
  else {
    const n = fs.readFileSync(np, 'utf8');
    if (n.includes("'/admin/bezpecnost'")) ok(`${np} (už obsahuje)`);
    else {
      const nl = nlOf(n);
      const lines = n.split(/\r?\n/);
      let idx = -1;
      for (const a of ["'/admin/blokovane-emaily'", "'/admin/users'", "'/admin/nahlasenia'", "'/admin/sdileni'"]) {
        idx = lines.findIndex((l) => l.includes(a) && l.includes('{') && l.includes('}'));
        if (idx >= 0) break;
      }
      if (idx < 0) bad(`v ${np} som nenašiel miesto — stránka je dostupná na /admin/bezpecnost`);
      else {
        const line = lines[idx]
          .replace(/'\/admin\/[a-z-]+'/, "'/admin/bezpecnost'")
          .replace(/label:\s*'[^']*'/, "label: 'Bezpečnost'")
          .replace(/,?\s*$/, '');
        if (!lines[idx].trimEnd().endsWith(',')) lines[idx] = lines[idx].trimEnd() + ',';
        lines.splice(idx + 1, 0, line + (lines[idx + 1] && lines[idx + 1].trim().startsWith('{') ? ',' : ''));
        fs.writeFileSync(np, lines.join(nl));
        ok(np);
      }
    }
  }
}

// 3) lib/prisma.ts — záznam činnosti pri vytvorení recenzie, komentára, správy…
{
  const p = 'lib/prisma.ts';
  let s = fs.readFileSync(p, 'utf8');
  if (s.includes('withActivityLog')) ok(`${p} (už obsahuje)`);
  else if (!s.includes('return withSettingsCache(createMeasuredClient());')) {
    bad(`${p} — chýba úprava z balíka Výkon 2 (najprv spusti node scripts\\vykon2-setup.mjs)`);
  } else {
    s = s.replace('return withSettingsCache(createMeasuredClient());', 'return withActivityLog(withSettingsCache(createMeasuredClient()));');
    s += `
// Bezpečnosť: pri vytvorení recenzie, komentára, príspevku, správy… sa uloží
// IP adresa autora (lib/security/activityLog.ts) — len pre úradné žiadosti.
const ACTIVITY_MODELS: Record<string, { action: string; user: string; rel: string; target?: string }> = {
  Review: { action: 'review', user: 'authorId', rel: 'author', target: 'movieId' },
  Comment: { action: 'comment', user: 'userId', rel: 'user', target: 'movieId' },
  Thread: { action: 'thread', user: 'authorId', rel: 'author', target: 'movieId' },
  Post: { action: 'post', user: 'authorId', rel: 'author', target: 'threadId' },
  Message: { action: 'message', user: 'senderId', rel: 'sender', target: 'receiverId' },
  BlogPost: { action: 'blog', user: 'authorId', rel: 'author' },
  ShopReview: { action: 'shop_review', user: 'userId', rel: 'user', target: 'productId' },
  User: { action: 'register', user: '', rel: '' }
};

async function logCreated(model: string, data: any, result: any, upsert: boolean) {
  const cfg = ACTIVITY_MODELS[model];
  if (!cfg || !data || (upsert && model === 'User')) return;
  try {
    const userId = model === 'User' ? result?.id : data[cfg.user] ?? data[cfg.rel]?.connect?.id ?? result?.[cfg.user];
    const targetId = cfg.target ? data[cfg.target] ?? result?.[cfg.target] ?? null : null;
    const { recordActivity } = await import('./security/activityLog');
    await recordActivity(userId, cfg.action, targetId);
  } catch (err) {
    console.error('[activityLog]', err);
  }
}

function withActivityLog(client: ReturnType<typeof withSettingsCache>) {
  return client.$extends({
    query: {
      $allModels: {
        async create({ model, args, query }) {
          const result = await query(args);
          await logCreated(model, (args as any)?.data, result, false);
          return result;
        },
        async upsert({ model, args, query }) {
          const result = await query(args);
          await logCreated(model, (args as any)?.create, result, true);
          return result;
        }
      }
    }
  });
}
`;
    fs.writeFileSync(p, s);
    ok(p);
  }
}

// 4) lib/auth.ts — prihlásenie na webe (heslom aj QR kódom)
{
  const p = 'lib/auth.ts';
  let s = fs.readFileSync(p, 'utf8');
  if (s.includes("recordActivity(String(token.id), 'login')")) ok(`${p} (už obsahuje)`);
  else {
    const anchor = s.includes('token.authAt = Date.now();') ? 'token.authAt = Date.now();' : 'token.id = (user as any).id;';
    if (!s.includes(anchor)) bad(`${p} — nenašiel som miesto pre záznam prihlásenia (pošli mi tento súbor)`);
    else {
      s = s.replace(anchor, `${anchor}\n        await recordActivity(String(token.id), 'login');`);
      s = addImport(s, "import { recordActivity } from './security/activityLog';");
      fs.writeFileSync(p, s);
      ok(p);
    }
  }
}

// 5) Obal okolo POST v route súbore (registrácia, prihlásenie v appke)
function wrapPost(p, marker, handlerName, importLine, wrapperBody) {
  if (!fs.existsSync(p)) return false;
  let s = fs.readFileSync(p, 'utf8');
  if (s.includes(marker)) {
    ok(`${p} (už obsahuje)`);
    return true;
  }
  if (!/export async function POST\s*\(/.test(s)) {
    bad(`${p} — nenašiel som funkciu POST (pošli mi tento súbor)`);
    return true;
  }
  s = s.replace(/export async function POST\s*\(/, `async function ${handlerName}(`);
  s = addImport(s, importLine);
  const nl = nlOf(s);
  s = s.trimEnd() + nl + nl + wrapperBody.split('\n').join(nl) + nl;
  fs.writeFileSync(p, s);
  ok(p);
  return true;
}

for (const [p, source] of [
  ['app/api/register/route.ts', 'web'],
  ['app/api/mobile/register/route.ts', 'app']
]) {
  const found = wrapPost(
    p,
    'withRegistrationLog(',
    '__registerPOST',
    "import { withRegistrationLog } from '@/lib/security/registrationLog';",
    `// Bezpečnosť: každý pokus o registráciu sa zaznamená (Administrace → Bezpečnost).
export async function POST(...args: Parameters<typeof __registerPOST>) {
  return withRegistrationLog('${source}', args, __registerPOST);
}`
  );
  if (!found) bad(`${p} neexistuje`);
}

{
  const candidates = ['app/api/mobile/login/route.ts', 'app/api/mobile/auth/login/route.ts', 'app/api/mobile/signin/route.ts'];
  let any = false;
  for (const p of candidates) {
    any =
      wrapPost(
        p,
        'withLoginLog(',
        '__loginPOST',
        "import { withLoginLog } from '@/lib/security/activityLog';",
        `// Bezpečnosť: úspešné prihlásenie v appke sa zaznamená (IP záznamy).
export async function POST(...args: Parameters<typeof __loginPOST>) {
  return withLoginLog(args, __loginPOST);
}`
      ) || any;
  }
  if (!any) bad('prihlásenie v appke (app/api/mobile/login) som nenašiel — pošli mi zoznam: dir app\\api\\mobile');
}

console.log(problems ? `\n${problems}x POZOR — pošli mi výpis.` : '\nVšetko upravené.');
