import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import AdminTabs from '@/components/AdminTabs';

export const dynamic = 'force-dynamic';

export default async function AdminAlertsPage() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') redirect('/login');

  const movies = await prisma.movie.findMany({
    where: { approved: true },
    select: {
      id: true,
      title: true,
      slug: true,
      poster: true,
      contentType: true,
      watchUrl: true,
      premiereDates: { select: { type: true, releaseDate: true } },
      streamingServices: { select: { id: true } },
      links: { select: { id: true } },
      seasons: { select: { episodes: { select: { onlineUrl: true } } } },
      _count: { select: { trivia: true } }
    }
  });

  const missingPremieres = movies.filter((m) => m.premiereDates.length === 0);
  const missingStreaming = movies.filter((m) => m.streamingServices.length === 0);
  const missingLinks = movies.filter((m) => m.links.length === 0);
  const missingOnline = movies.filter((m) =>
    m.contentType === 'Seriál' ? !m.seasons.some((s) => s.episodes.some((ep) => ep.onlineUrl)) : !m.watchUrl
  );
  const missingTrivia = movies.filter((m) => m._count.trivia === 0);

  // Filmy, čo majú kinovú premiéru staršiu ako 60 dní a stále nemajú nastavený online odkaz —
  // je čas skontrolovať, či sa medzičasom neobjavil kvalitný zdroj.
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
  const readyForOnlineCheck = movies.filter((m) => {
    if (m.contentType === 'Seriál' ? m.seasons.some((s) => s.episodes.some((ep) => ep.onlineUrl)) : !!m.watchUrl) return false;
    const kinoPremiere = m.premiereDates.find((p) => p.type !== 'VOD');
    return kinoPremiere && kinoPremiere.releaseDate <= sixtyDaysAgo;
  });

  const Section = ({ title, href, items, hint }: { title: string; href: string; items: typeof movies; hint: string }) => (
    <div className="border border-line rounded-xl overflow-hidden mb-6">
      <div className="bg-surface px-4 py-2.5 flex items-center justify-between">
        <h2 className="font-display font-bold text-sm text-ink">{title}</h2>
        <span className="text-xs font-semibold text-danger">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted p-4">{hint}</p>
      ) : (
        <div className="divide-y divide-line max-h-72 overflow-y-auto">
          {items.map((m) => (
            <Link key={m.id} href={href} className="flex items-center gap-3 p-3 hover:bg-surface">
              <div className="w-8 h-11 rounded bg-surface bg-cover bg-center flex-none" style={m.poster ? { backgroundImage: `url('${m.poster}')` } : undefined} />
              <span className="text-sm font-semibold text-ink truncate">{m.title}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="pt-8">
      <AdminTabs />
      <h1 className="font-display font-extrabold text-3xl text-ink mb-2">Upozornění</h1>
      <p className="text-sm text-muted mb-6">
        Přehled všeho, co ještě chybí doplnit. Tato stránka vždy zobrazí aktuální stav — kontroluj ji pravidelně, dokud na web nepřibudou pravidelná upozornění.
      </p>

      <div className="border border-accent rounded-xl overflow-hidden mb-8 bg-accent/5">
        <div className="bg-accent px-4 py-2.5 flex items-center justify-between">
          <h2 className="font-display font-bold text-sm text-white">Čas zkontrolovat kvalitní zdroj (2+ měsíce v kinech)</h2>
          <span className="text-xs font-semibold text-white">{readyForOnlineCheck.length}</span>
        </div>
        {readyForOnlineCheck.length === 0 ? (
          <p className="text-sm text-muted p-4">Zatím nic — všechny filmy starší než 2 měsíce už mají online odkaz.</p>
        ) : (
          <div className="divide-y divide-line">
            {readyForOnlineCheck.map((m) => (
              <Link key={m.id} href="/admin/online" className="flex items-center gap-3 p-3 hover:bg-card">
                <div className="w-8 h-11 rounded bg-surface bg-cover bg-center flex-none" style={m.poster ? { backgroundImage: `url('${m.poster}')` } : undefined} />
                <span className="text-sm font-semibold text-ink truncate">{m.title}</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      <Section title="Chybějící premiéry" href="/admin/premieres" items={missingPremieres} hint="Vše vyplněno." />
      <Section title="Chybějící streamovací služby" href="/admin/kde-sledovat" items={missingStreaming} hint="Vše vyplněno." />
      <Section title="Chybějící odkazy" href="/admin/odkazy" items={missingLinks} hint="Vše vyplněno." />
      <Section title="Chybějící online odkaz" href="/admin/online" items={missingOnline} hint="Vše vyplněno." />

      <div className="border border-line rounded-xl overflow-hidden mb-6">
        <div className="bg-surface px-4 py-2.5 flex items-center justify-between">
          <h2 className="font-display font-bold text-sm text-ink">Chybějící zajímavosti</h2>
          <span className="text-xs font-semibold text-danger">{missingTrivia.length}</span>
        </div>
        {missingTrivia.length === 0 ? (
          <p className="text-sm text-muted p-4">Vše vyplněno.</p>
        ) : (
          <div className="divide-y divide-line max-h-72 overflow-y-auto">
            {missingTrivia.map((m) => (
              <Link key={m.id} href={`/admin/movies/${m.id}/edit`} className="flex items-center gap-3 p-3 hover:bg-surface">
                <div className="w-8 h-11 rounded bg-surface bg-cover bg-center flex-none" style={m.poster ? { backgroundImage: `url('${m.poster}')` } : undefined} />
                <span className="text-sm font-semibold text-ink truncate">{m.title}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
