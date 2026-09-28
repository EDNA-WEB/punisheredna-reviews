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
