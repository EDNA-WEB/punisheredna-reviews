import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getDictionary, getUserLanguage } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

export default async function GenresPage() {
  const dict = await getDictionary(await getUserLanguage());
  const t = (key: string) => dict[key] || key;

  const movies = await prisma.movie.findMany({ select: { genres: true } });

  const counts = new Map<string, number>();
  for (const m of movies) {
    (m.genres || '').split(',').map((g) => g.trim()).filter(Boolean).forEach((g) => {
      counts.set(g, (counts.get(g) || 0) + 1);
    });
  }
  const genres = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);

  return (
    <div className="pt-8">
      <h1 className="font-display font-extrabold text-3xl text-ink mb-2">{t('zanre.nadpis')}</h1>
      <p className="text-muted mb-8">{t('zanre.popis')}</p>

      {genres.length === 0 ? (
        <div className="border border-line rounded-xl p-8 text-center text-muted bg-surface">
          {t('zanre.prazdny')}
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">
          {genres.map(([g, count]) => (
            <Link
              key={g}
              href={`/recenzie?genre=${encodeURIComponent(g)}`}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full font-semibold text-sm text-ink bg-surface border border-line hover:border-accent hover:text-accent transition-colors"
            >
              {g}
              <span className="text-xs text-muted">{count}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
