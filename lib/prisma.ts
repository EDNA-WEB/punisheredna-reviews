import { PrismaClient } from '@prisma/client';
import { PERF_ENABLED, sourceFromStack, sourceFromNext, recordQuery, shouldFlush, flushPerf } from './perfMonitor';

const globalForPrisma = globalThis as unknown as { prisma: ReturnType<typeof createPrismaClient> };

// Niektoré peňažné polia (rozpočet, tržby) sú v databáze typu BigInt (kvôli filmom s tržbami
// nad 2,1 miliardy). BigInt sa ale nedá priamo poslať cez JSON a nedá sa sčítať s bežným číslom
// bez explicitnej konverzie. Toto rozšírenie automaticky prevedie KAŽDÉ BigInt pole vrátené
// z databázy na bežné číslo (number) — reálne hodnoty rozpočtov/tržieb sú vždy hlboko pod
// bezpečnou hranicou pre number (Number.MAX_SAFE_INTEGER), takže sa tým nič nestratí.
//
// Zároveň tu beží monitoring záťaže databázy (lib/perfMonitor.ts) — meria
// každý dopyt a raz za minútu uloží súhrn pre dashboard Administrácia → Výkon.
function createPrismaClient() {
  return withActivityLog(withSettingsCache(createMeasuredClient()));
}

function createMeasuredClient() {
  const base = new PrismaClient();
  return base.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!PERF_ENABLED) return convertBigInts(await query(args));
          // Zásobník treba zachytiť PRED "await", inak sa stratí, kto dopyt volal.
          const stack = new Error().stack;
          const started = performance.now();
          const result = await query(args);
          const fromStack = sourceFromStack(stack);
          const source = fromStack === 'neznámy' || fromStack.startsWith('lib/') ? sourceFromNext() || fromStack : fromStack;
          recordQuery(source, model, operation, performance.now() - started);
          if (shouldFlush()) await flushPerf(base);
          return convertBigInts(result);
        }
      }
    }
  });
}

function convertBigInts(value: any): any {
  if (typeof value === 'bigint') return Number(value);
  if (Array.isArray(value)) return value.map(convertBigInts);
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    for (const key of Object.keys(value)) {
      value[key] = convertBigInts(value[key]);
    }
  }
  return value;
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Výkon: tabuľka Settings (jeden riadok s nastaveniami webu) sa čítala pri
// každom zobrazení stránky – na /login aj tisíckrát za deň. Čítanie sa teraz
// pamätá 60 sekúnd v rámci inštancie servera. Akýkoľvek zápis do Settings
// pamäť okamžite vymaže, takže admin vidí zmenu hneď; ostatné inštancie
// najneskôr do minúty.
const SETTINGS_TTL_MS = 60_000;
const SETTINGS_READS = new Set(['findUnique', 'findFirst', 'findUniqueOrThrow', 'findFirstOrThrow']);
const settingsCache: Map<string, { at: number; value: Promise<unknown> }> =
  ((globalThis as any).__settingsCache ||= new Map());

function withSettingsCache(client: ReturnType<typeof createMeasuredClient>) {
  return client.$extends({
    query: {
      settings: {
        async $allOperations({ operation, args, query }) {
          if (!SETTINGS_READS.has(operation)) {
            settingsCache.clear();
            try {
              return await query(args);
            } finally {
              settingsCache.clear();
            }
          }
          const key = operation + ':' + JSON.stringify(args ?? {});
          const now = Date.now();
          const hit = settingsCache.get(key);
          if (hit && now - hit.at < SETTINGS_TTL_MS) return hit.value as any;
          const value = Promise.resolve(query(args));
          settingsCache.set(key, { at: now, value });
          value.catch(() => {
            if (settingsCache.get(key)?.value === value) settingsCache.delete(key);
          });
          return value;
        }
      }
    }
  });
}

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
