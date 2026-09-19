import Link from 'next/link';
import { getCachedUserRankings } from '@/lib/cachedGeneralData';
import { IconUser, IconHeart } from '@/components/Icons';
import CriticBadge from '@/components/CriticBadge';

export const dynamic = 'force-dynamic';

export default async function UsersPage({ searchParams }: { searchParams: { sort?: string } }) {
  const sortMode = searchParams?.sort === 'karma' ? 'karma' : 'activity';

  const withStats = await getCachedUserRankings();

  const ranked = withStats
    .filter((u) => u.total > 0 || u.karma > 0)
    .sort((a, b) => {
      if (sortMode === 'karma') {
        if (a.role === 'ADMIN' && b.role !== 'ADMIN') return -1;
        if (b.role === 'ADMIN' && a.role !== 'ADMIN') return 1;
        return b.karma - a.karma;
      }
      return b.total - a.total;
    });

  return (
    <div className="pt-8">
      <div className="flex items-center justify-between mb-2 flex-wrap gap-3">
        <h1 className="font-display font-extrabold text-3xl text-ink">Používatelia</h1>
        <div className="flex gap-2">
          <Link href="/pouzivatelia?sort=activity" className={`text-xs font-semibold px-3.5 py-1.5 rounded-full border ${sortMode === 'activity' ? 'bg-night text-white border-night' : 'text-muted border-line hover:border-night'}`}>
            Podľa aktivity
          </Link>
          <Link href="/pouzivatelia?sort=karma" className={`text-xs font-semibold px-3.5 py-1.5 rounded-full border ${sortMode === 'karma' ? 'bg-night text-white border-night' : 'text-muted border-line hover:border-night'}`}>
            Podľa karmy
          </Link>
        </div>
      </div>
      <p className="text-muted mb-8">
        {sortMode === 'karma'
          ? 'Rebríček podľa karmy — súčtu lajkov, ktoré dostali ich recenzie, komentáre a diskusné príspevky.'
          : 'Rebríček podľa počtu príspevkov, komentárov a recenzií na stránke.'}
      </p>

      {ranked.length === 0 ? (
        <div className="border border-line rounded-xl p-8 text-center text-muted bg-surface">
          Zatiaľ nikto neprispel.
        </div>
      ) : (
        <div className="border border-line rounded-xl divide-y divide-line overflow-hidden">
          {ranked.map((u, i) => (
            <Link key={u.id} href={`/profile/${u.id}`} className="flex items-center gap-4 p-4 bg-card hover:bg-surface transition-colors">
              <span className="w-8 text-center font-display font-extrabold text-lg text-accent flex-none">{i + 1}</span>
              {u.avatar ? (
                <img src={u.avatar} alt={u.name} className="w-10 h-10 rounded-full object-cover flex-none" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-surface flex items-center justify-center flex-none">
                  <IconUser className="w-5 h-5 text-muted" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-ink flex items-center gap-1.5">
                  {u.name}
                  {u.role === 'ADMIN' && <CriticBadge size="w-3.5 h-3.5" label={false} />}
                  
                </div>
                <div className="text-xs text-muted mt-0.5">
                  {u._count.reviews > 0 && `${u._count.reviews} recenzií · `}
                  {u._count.comments} komentárov · {u._count.posts + u._count.threads} príspevkov v diskusii
                </div>
              </div>
              <div className="text-right flex-none">
                <div className="font-display font-extrabold text-xl text-ink flex items-center gap-1.5 justify-end">
                  {sortMode === 'karma' && <IconHeart className="w-4 h-4 text-accent" filled />}
                  {sortMode === 'karma' ? (u.role === 'ADMIN' ? '∞' : u.karma) : u.total}
                </div>
                <div className="text-[10px] text-muted uppercase tracking-wide">{sortMode === 'karma' ? 'karma' : 'spolu'}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
