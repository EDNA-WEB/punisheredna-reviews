import { prisma } from './prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
import { TRANSLATION_REGISTRY } from './translationRegistry';
import { cookies } from 'next/headers';
import { unstable_cache } from 'next/cache';
import { memo } from './memoCache';

const SUPPORTED_LANGUAGES = ['sk', 'en', 'cs'];

// Výkon: preklady z databázy sa menia len keď ich admin upraví, no načítavali
// sa pri KAŽDOM zobrazení každej stránky. Teraz: pamäť inštancie (5 min) +
// zdieľaná cache (1 h). Uloženie prekladu v administrácii cache hneď zahodí
// (revalidateTag('translations') v app/api/translations).
const getTranslationRows = unstable_cache(
  () => prisma.translationString.findMany({ select: { key: true, sk: true, en: true, cs: true } }),
  ['translation-rows'],
  { revalidate: 3600, tags: ['translations'] }
);

export async function getDictionary(language: string): Promise<Record<string, string>> {
  return memo(`dict:${language}`, 5 * 60 * 1000, () => buildDictionary(language));
}

async function buildDictionary(language: string): Promise<Record<string, string>> {
  const dict: Record<string, string> = {};

  // Základ: register priamo v kóde — funguje okamžite pre nové kľúče,
  // aj keby ešte neboli zosynchronizované do databázy (napr. admin
  // ešte nenavštívil Administrácia → Preklad).
  for (const entry of TRANSLATION_REGISTRY) {
    dict[entry.key] = entry.sk;
  }

  // Prepíš hodnotami z databázy — tam sú preklady (EN/CS), čo admin doplnil,
  // prípadne aktuálnejšie slovenské znenie.
  const rows = await getTranslationRows();
  for (const r of rows) {
    const value = language === 'en' ? r.en : language === 'cs' ? r.cs : null;
    dict[r.key] = value || r.sk;
  }

  return dict;
}

export async function getUserLanguage(): Promise<string> {
  // Dočasný prepínač jazyka z navbaru (funguje len do zatvorenia prehliadača —
  // je to session cookie bez max-age) má prednosť pred natrvalo uloženou voľbou.
  const sessionLang = cookies().get('lang')?.value;
  if (sessionLang && SUPPORTED_LANGUAGES.includes(sessionLang)) return sessionLang;

  const session = await getServerSession(authOptions);
  if (!session) return 'sk';
  const user = await prisma.user.findUnique({
    where: { id: (session.user as any).id },
    select: { language: true }
  });
  return user?.language || 'sk';
}
