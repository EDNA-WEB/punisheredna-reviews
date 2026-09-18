import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import AdminTabs from '@/components/AdminTabs';

export const dynamic = 'force-dynamic';

function StatRow({ label, value, total, href }: { label: string; value: number; total: number; href: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <a href={href} className="flex items-center gap-3 py-2.5 border-b border-line last:border-0 hover:bg-surface -mx-2 px-2 rounded-lg transition-colors">
      <span className="text-sm text-ink flex-1">{label}</span>
      <div className="w-28 h-1.5 rounded-full bg-line overflow-hidden hidden sm:block">
        <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm font-bold text-ink w-20 text-right">
        {value} <span className="text-muted font-normal">/ {total}</span>
      </span>
    </a>
  );
}

export default async function AdminOverviewPage() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') redirect('/login');

  const totalApproved = await prisma.movie.count({ where: { approved: true } });

  const [
    withOnline,
    withStreamingService,
    withTwoPlusLinks,
    withPremiere,
    withDubbingOrSubs,
    withTrivia,
    withTags,
    totalTranslationKeys,
    translatedEn,
    translatedCs
  ] = await Promise.all([
    prisma.movie.count({ where: { approved: true, OR: [{ watchUrl: { not: null } }, { seasons: { some: { episodes: { some: { onlineUrl: { not: null } } } } } }] } }),
    prisma.movie.count({ where: { approved: true, streamingServices: { some: {} } } }),
    prisma.movie
      .findMany({ where: { approved: true }, select: { _count: { select: { links: true } } } })
      .then((rows) => rows.filter((r) => r._count.links >= 2).length),
    prisma.movie.count({ where: { approved: true, premiereDates: { some: {} } } }),
    prisma.movie.count({ where: { approved: true, OR: [{ hasDubbing: true }, { hasSubtitles: true }] } }),
    prisma.movie.count({ where: { approved: true, trivia: { some: {} } } }),
    prisma.movie.count({ where: { approved: true, tags: { not: null } } }),
    prisma.translationString.count(),
    prisma.translationString.count({ where: { en: { not: null } } }),
    prisma.translationString.count({ where: { cs: { not: null } } })
  ]);

  return (
    <div className="pt-8">
      <AdminTabs />
      <div className="text-xs font-semibold text-accent uppercase tracking-wider mb-1">Administrácia</div>
      <h1 className="font-display font-extrabold text-3xl text-ink mb-2">Prehľad</h1>
      <p className="text-sm text-muted mb-6 max-w-2xl">
        Rýchly prehľad, koľko je z {totalApproved} schválených filmov a seriálov doplnených v jednotlivých oblastiach —
        klikni na riadok pre priamy prechod na danú sekciu.
      </p>

      <div className="max-w-2xl border border-line rounded-xl p-5 bg-card mb-6">
        <h2 className="text-xs font-bold uppercase tracking-wide text-muted mb-1">Profil filmu</h2>
        <StatRow label="Majú online odkaz" value={withOnline} total={totalApproved} href="/admin/online" />
        <StatRow label="Majú aspoň 1 VOD platformu (Kde sledovať)" value={withStreamingService} total={totalApproved} href="/admin/kde-sledovat" />
        <StatRow label="Majú aspoň 2 odkazy (IMDb/ČSFD...)" value={withTwoPlusLinks} total={totalApproved} href="/admin/odkazy" />
        <StatRow label="Majú nastavenú aspoň 1 premiéru" value={withPremiere} total={totalApproved} href="/admin/premieres" />
        <StatRow label="Majú dabing alebo titulky" value={withDubbingOrSubs} total={totalApproved} href="/admin/lokalizacia" />
        <StatRow label="Majú aspoň 1 zaujímavosť" value={withTrivia} total={totalApproved} href="/admin/zaujimavosti" />
        <StatRow label="Majú vyplnené tagy" value={withTags} total={totalApproved} href="/admin/tagy" />
      </div>

      <div className="max-w-2xl border border-line rounded-xl p-5 bg-card">
        <h2 className="text-xs font-bold uppercase tracking-wide text-muted mb-1">Preklad webu</h2>
        <StatRow label="Kľúčov preložených do angličtiny" value={translatedEn} total={totalTranslationKeys} href="/admin/preklad" />
        <StatRow label="Kľúčov preložených do češtiny" value={translatedCs} total={totalTranslationKeys} href="/admin/preklad" />
      </div>
    </div>
  );
}
