import { unstable_cache } from 'next/cache';
import { prisma } from './prisma';

export type PersonToday = { id: string; name: string; slug: string; photo: string | null; birthDate: Date | string | null; deathDate: Date | string | null };

// "Dnes slávia narodeniny" — zhoda mesiaca a dňa narodenia s dneškom, bez
// ohľadu na rok (Prisma to priamo nevie, preto SQL). Len žijúci a s fotkou.
// Zdieľané webom (hlavná stránka) aj appkou (/api/mobile/birthdays-today).
// Cache 1 hodina a kľúč obsahuje dátum → po polnoci sa zoznam zmení sám.
async function loadBirthdays(limit: number): Promise<PersonToday[]> {
  return prisma.$queryRaw<PersonToday[]>`
    SELECT id, name, slug, photo, "birthDate", "deathDate" FROM "Person"
    WHERE approved = true
      AND "deathDate" IS NULL
      AND "birthDate" IS NOT NULL
      AND photo IS NOT NULL
      AND EXTRACT(MONTH FROM "birthDate") = EXTRACT(MONTH FROM CURRENT_DATE)
      AND EXTRACT(DAY FROM "birthDate") = EXTRACT(DAY FROM CURRENT_DATE)
    ORDER BY name ASC
    LIMIT ${limit}
  `;
}

export async function getBirthdaysToday(limit = 8): Promise<PersonToday[]> {
  const day = new Date().toISOString().slice(0, 10);
  return unstable_cache(() => loadBirthdays(limit), ['birthdays-today', day, String(limit)], { revalidate: 3600 })();
}
