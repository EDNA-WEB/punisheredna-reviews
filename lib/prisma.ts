import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: ReturnType<typeof createPrismaClient> };

// Niektoré peňažné polia (rozpočet, tržby) sú v databáze typu BigInt (kvôli filmom s tržbami
// nad 2,1 miliardy). BigInt sa ale nedá priamo poslať cez JSON a nedá sa sčítať s bežným číslom
// bez explicitnej konverzie. Toto rozšírenie automaticky prevedie KAŽDÉ BigInt pole vrátené
// z databázy na bežné číslo (number) — reálne hodnoty rozpočtov/tržieb sú vždy hlboko pod
// bezpečnou hranicou pre number (Number.MAX_SAFE_INTEGER), takže sa tým nič nestratí.
function createPrismaClient() {
  return new PrismaClient().$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query }) {
          const result = await query(args);
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
