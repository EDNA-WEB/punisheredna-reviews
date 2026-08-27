import { prisma } from '@/lib/prisma';
import CountdownBadge from './CountdownBadge';
import { getDictionary, getUserLanguage } from '@/lib/i18n';

export default async function PremieresList() {
  const t = (await getDictionary(await getUserLanguage()));
  const premieres = await prisma.premiere.findMany({
    where: { releaseDate: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
    orderBy: { releaseDate: 'asc' },
    take: 4
  });

  if (premieres.length === 0) return null;

  return (
    <div className="border border-line rounded-xl p-4 bg-card h-full">
      <h3 className="font-display font-bold text-sm text-ink mb-3">{t['home.v_kinach_coskoro'] || 'V kinách čoskoro'}</h3>
      <div className="space-y-3">
        {premieres.map((p) => (
          <div key={p.id} className="flex items-center gap-3">
            <CountdownBadge date={p.releaseDate} />
            <div className="min-w-0">
              <div className="text-sm font-semibold text-ink leading-snug">{p.title}</div>
              <div className="text-[11px] text-muted">
                {[p.year, p.country, p.genres].filter(Boolean).join(' · ')}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
