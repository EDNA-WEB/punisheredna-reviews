import { tmdbGetPersonFilmography } from '@/lib/tmdb';

export default async function PersonTmdbFilmography({ tmdbId, role }: { tmdbId: number; role: 'ACTOR' | 'CREATOR' }) {
  const { asActor, asCrew } = await tmdbGetPersonFilmography(tmdbId);
  const list = role === 'ACTOR' ? asActor : (asCrew.length > 0 ? asCrew : asActor);

  if (list.length === 0) return null;

  return (
    <div className="border border-line rounded-xl overflow-hidden mb-6">
      <div className="bg-surface px-4 py-2.5 flex items-center justify-between">
        <h3 className="font-display font-bold text-sm text-ink">Filmografia</h3>
        <span className="text-[10px] text-muted uppercase tracking-wide">Zdroj: TMDb</span>
      </div>
      <p className="text-xs text-muted px-4 pt-3">
        Kompletný prehľad podľa TMDb — niektoré z týchto titulov zatiaľ nemusia byť na našom webe pridané.
      </p>
      <div className="p-4 flex flex-wrap gap-3">
        {list.map((item: any, i: number) => (
          <div key={i} className="w-20 flex-none text-center">
            <div className="w-20 h-28 rounded-lg bg-surface bg-cover bg-center border border-line mb-1" style={item.poster ? { backgroundImage: `url('${item.poster}')` } : undefined} />
            <div className="text-xs font-semibold text-ink leading-snug line-clamp-2">{item.title}</div>
            <div className="text-[11px] text-muted">{item.year}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
