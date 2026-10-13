import Link from 'next/link';
import { ApUser } from '../article/ArticleIcons';

// Pravý stĺpec nového profilu osobnosti: fakty, spolupracovníci, žánre, fanúšikovia.
type Collaborator = { id: string; name: string; slug: string; photo: string | null; role: string; count: number };

export default function PersonSidebar({
  facts,
  collaborators,
  genres,
  fans,
  fanCount,
  mutual,
  L
}: {
  facts: { label: string; value: string }[];
  collaborators: Collaborator[];
  genres: { genre: string; percent: number }[];
  fans: { id: string; name: string; avatar: string | null }[];
  fanCount: number;
  mutual: { names: string[]; total: number } | null;
  L: Record<string, string>;
}) {
  const filmWord = (n: number) => (n === 1 ? L.film_1 : n < 5 ? L.film_2_4 : L.film_5);
  return (
    <div className="space-y-5">
      {facts.length > 0 && (
        <div className="ap-card p-5">
          <div className="ap-label mb-2">{L.o_osobnosti}</div>
          {facts.map((f, i) => (
            <div key={f.label} className={`flex gap-3 py-2 text-[14px] ${i ? 'border-t border-line' : ''}`}>
              <span className="text-muted flex-none">{f.label}</span>
              <span className="ml-auto font-semibold text-ink text-right min-w-0 break-words">{f.value}</span>
            </div>
          ))}
        </div>
      )}

      {collaborators.length > 0 && (
        <div className="ap-card p-5">
          <div className="ap-label mb-3">{L.casto_spolupracuje}</div>
          <div className="space-y-1">
            {collaborators.slice(0, 6).map((c) => (
              <Link key={c.id} href={`/osobnost/${c.slug}`} className="flex items-center gap-3 rounded-xl p-1.5 -mx-1.5 hover:bg-surface group">
                {c.photo ? (
                  <img src={c.photo} alt={c.name} className="w-[42px] h-[42px] rounded-full object-cover object-top flex-none bg-surface" loading="lazy" />
                ) : (
                  <span className="w-[42px] h-[42px] rounded-full flex items-center justify-center bg-surface2 text-muted flex-none">
                    <ApUser className="w-5 h-5" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-semibold text-ink truncate group-hover:text-accent">{c.name}</div>
                  <div className="text-[12px] text-muted truncate">
                    {c.count} {filmWord(c.count)} {L.spolu}
                  </div>
                </div>
                <svg className="w-[15px] h-[15px] text-muted flex-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12h14m-5-5.5L19.5 12 14 17.5" />
                </svg>
              </Link>
            ))}
          </div>
          <p className="text-[11.5px] text-muted mt-2">{L.na_zaklade}</p>
        </div>
      )}

      {genres.length > 0 && (
        <div className="ap-card p-5">
          <div className="ap-label mb-3">{L.zanry}</div>
          <div className="space-y-2.5">
            {genres.map((g, i) => (
              <div key={g.genre}>
                <div className="flex text-[13.5px] font-semibold text-ink">
                  <span className="truncate">{g.genre}</span>
                  <span className="ml-auto text-muted tabular-nums">{g.percent}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-surface2 mt-1.5 overflow-hidden">
                  <div className="h-full rounded-full pf-genre-bar" style={{ width: `${Math.max(4, (g.percent / Math.max(1, genres[0].percent)) * 100)}%`, opacity: 1 - i * 0.12 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="ap-card p-5">
        <div className="flex items-center mb-3.5">
          <div className="ap-label">{L.fanousci}</div>
          <span className="ml-auto text-[13px] font-bold text-ink tabular-nums">{fanCount.toLocaleString('cs-CZ')}</span>
        </div>
        {fans.length === 0 ? (
          <p className="text-[13.5px] text-muted">{L.zadni_fanousci}</p>
        ) : (
          <div className="grid grid-cols-5 gap-2.5">
            {fans.slice(0, fanCount > 10 ? 9 : 10).map((f) => (
              <Link key={f.id} href={`/profile/${f.id}`} title={f.name} className="block">
                {f.avatar ? (
                  <img src={f.avatar} alt={f.name} className="pf-fan" loading="lazy" />
                ) : (
                  <span className="pf-fan flex items-center justify-center bg-surface2 text-muted">
                    <ApUser className="w-1/2 h-1/2" />
                  </span>
                )}
              </Link>
            ))}
            {fanCount > 10 && <span className="pf-fan flex items-center justify-center bg-surface text-[11.5px] font-bold text-muted">+{(fanCount - 9).toLocaleString('cs-CZ')}</span>}
          </div>
        )}
        {mutual && mutual.total > 0 && (
          <div className="mt-4 pt-3.5 border-t border-line text-[13px] text-muted leading-snug">
            {L.ma_ho_i} <b className="text-ink">{mutual.names.slice(0, 2).join(', ')}</b>
            {mutual.total > 2 ? ` ${L.a_dalsi} ${mutual.total - 2}` : ''}
          </div>
        )}
      </div>
    </div>
  );
}
