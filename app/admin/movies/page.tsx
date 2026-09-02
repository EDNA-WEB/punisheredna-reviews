import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import AdminTabs from '@/components/AdminTabs';
import Link from 'next/link';
import AdminMovieActions from '@/components/AdminMovieActions';
import MovieNowShowingToggle from '@/components/MovieNowShowingToggle';
import ApproveMovieButton from '@/components/ApproveMovieButton';

export const dynamic = 'force-dynamic';

export default async function AdminMoviesPage({ searchParams }: { searchParams: { type?: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') redirect('/login');

  const typeFilter = searchParams?.type && searchParams.type !== 'all' ? searchParams.type : null;

  const [pending, approved] = await Promise.all([
    prisma.movie.findMany({
      where: { approved: false },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { ratings: { where: { seasonId: null, episodeId: null } }, reviews: { where: { seasonId: null, episodeId: null } } } }, submittedBy: { select: { name: true } } }
    }),
    prisma.movie.findMany({
      where: { approved: true, ...(typeFilter ? { contentType: typeFilter } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 300,
      include: { _count: { select: { ratings: { where: { seasonId: null, episodeId: null } }, reviews: { where: { seasonId: null, episodeId: null } } } }, submittedBy: { select: { name: true } } }
    })
  ]);

  const typeTabs = [
    { key: 'all', label: 'Všetko' },
    { key: 'Film', label: 'Filmy' },
    { key: 'Seriál', label: 'Seriály' },
    { key: 'TV film', label: 'TV filmy' }
  ];

  return (
    <div className="pt-8">
      <AdminTabs />
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <div className="text-xs font-semibold text-accent uppercase tracking-wider mb-1">Administrácia</div>
          <h1 className="font-display font-extrabold text-3xl text-ink">Filmy a seriály</h1>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/movies/hromadny-import"
            className="border border-line text-ink px-5 py-2.5 rounded-full text-sm font-semibold hover:border-accent hover:text-accent"
          >
            Hromadný import z TMDb
          </Link>
          <Link
            href={typeFilter === 'Seriál' ? '/admin/movies/new?type=Seriál' : typeFilter === 'TV film' ? '/admin/movies/new?type=TV film' : '/admin/movies/new'}
            className="bg-accent text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-accent-dark"
          >
            {typeFilter === 'Seriál' ? '+ Pridať seriál' : typeFilter === 'TV film' ? '+ Pridať TV film' : '+ Pridať film'}
          </Link>
        </div>
      </div>

      {pending.length > 0 && (
        <div className="mb-8">
          <h2 className="font-display font-bold text-lg text-ink mb-3">Čakajú na schválenie ({pending.length})</h2>
          <div className="border border-amber-300 rounded-xl divide-y divide-amber-200 overflow-hidden bg-amber-50">
            {pending.map((m) => (
              <div key={m.id} className="flex items-center gap-4 p-4">
                <div className="w-12 h-16 rounded-md bg-surface bg-cover bg-center flex-none" style={m.poster ? { backgroundImage: `url('${m.poster}')` } : undefined} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Link href={`/movie/${m.slug}`} className="font-display font-bold text-ink hover:text-accent">{m.title}</Link>
                    {m.contentType && m.contentType !== 'Film' && (
                      <span className="text-[10px] font-semibold text-accent border border-accent/40 px-2 py-0.5 rounded-full flex-none">
                        {m.contentType}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted mt-1">
                    {m.year} · navrhol/-a {m.submittedBy?.name || 'neznámy'}
                  </div>
                </div>
                <ApproveMovieButton id={m.id} />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {typeTabs.map((tb) => (
          <Link
            key={tb.key}
            href={`/admin/movies?type=${tb.key}`}
            className={`text-xs font-semibold px-3.5 py-1.5 rounded-full border ${
              (typeFilter || 'all') === tb.key ? 'bg-night text-white border-night' : 'text-muted border-line hover:border-night'
            }`}
          >
            {tb.label}
          </Link>
        ))}
      </div>

      {approved.length === 0 ? (
        <div className="border border-line rounded-xl p-10 text-center text-muted bg-surface">
          Zatiaľ žiadne filmy. Pridaj prvý — recenziu potom vieš pridať len k existujúcemu filmu.
        </div>
      ) : (
        <div className="border border-line rounded-xl divide-y divide-line overflow-hidden">
          {approved.map((m) => (
            <div key={m.id} className="flex items-center gap-4 p-4 bg-card">
              <div className="w-12 h-16 rounded-md bg-surface bg-cover bg-center flex-none" style={m.poster ? { backgroundImage: `url('${m.poster}')` } : undefined} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="font-display font-bold text-lg text-ink truncate">{m.title}</div>
                  {m.contentType && m.contentType !== 'Film' && (
                    <span className="text-[10px] font-semibold text-accent border border-accent/40 px-2 py-0.5 rounded-full flex-none">
                      {m.contentType}
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted mt-1">{m.year} · {m._count.ratings} hodnotení · {m._count.reviews} recenzií</div>
              </div>
              <MovieNowShowingToggle id={m.id} nowShowing={m.nowShowing} />
              <AdminMovieActions id={m.id} slug={m.slug} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
