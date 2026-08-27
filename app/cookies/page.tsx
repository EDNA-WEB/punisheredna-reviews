import { prisma } from '@/lib/prisma';
import { DEFAULT_COOKIES_TEXT } from '@/lib/privacyDefaults';
import { getDictionary, getUserLanguage } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

function isHeading(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 60) return false;
  const letters = trimmed.replace(/[^\p{L}]/gu, '');
  if (letters.length < 3) return false;
  return letters === letters.toUpperCase();
}

export default async function CookiesPage() {
  const settings = await prisma.settings.findUnique({ where: { id: 'singleton' } });
  const dict = await getDictionary(await getUserLanguage());
  const text = settings?.cookiesPolicyText || DEFAULT_COOKIES_TEXT;
  const lines = text.split('\n');

  return (
    <div className="pt-8 max-w-2xl">
      <h1 className="font-display font-extrabold text-3xl text-ink mb-8">{dict['cookies.nadpis']}</h1>
      <div className="space-y-1">
        {lines.map((line, i) =>
          isHeading(line) ? (
            <h2 key={i} className="font-display font-bold text-lg text-ink mt-7 mb-2 first:mt-0">
              {line.trim()}
            </h2>
          ) : line.trim() ? (
            <p key={i} className="text-sm text-muted leading-relaxed mb-2">
              {line}
            </p>
          ) : (
            <div key={i} className="h-1" />
          )
        )}
      </div>
    </div>
  );
}
