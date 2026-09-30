import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getMobileUser } from '@/lib/mobileAuth';
import { getCachedMovieBySlug, getCachedMovieSeasons } from '@/lib/cachedMovieData';
import { isActiveMember } from '@/lib/membership';

export const dynamic = 'force-dynamic';

// Online sledovanie pre appku — rovnaké pravidlá ako záložka "Online" na
// webe (app/movie/[slug]/page.tsx): odkaz vidí len Golden Ticket člen, alebo
// všetci, ak je v nastaveniach zapnuté "onlineFreeForAll". Nečlen dostane
// len informáciu, že online verzia existuje — samotné odkazy nie.
export async function GET(req: Request) {
  try {
    const me = await getMobileUser(req);
    if (!me) return NextResponse.json({ error: 'Neplatné nebo vypršelé přihlášení.' }, { status: 401 });
    const isAdmin = me.role === 'ADMIN';

    const { searchParams } = new URL(req.url);
    let slug = searchParams.get('slug');
    const id = searchParams.get('id');
    if (!slug && id) {
      const found = await prisma.movie.findUnique({ where: { id }, select: { slug: true } });
      slug = found?.slug || null;
    }
    if (!slug) return NextResponse.json({ error: 'Film se nenašel.' }, { status: 404 });

    const [movie, settings] = await Promise.all([
      getCachedMovieBySlug(slug),
      prisma.settings.findUnique({ where: { id: 'singleton' }, select: { onlineFreeForAll: true } })
    ]);
    if (!movie || (!movie.approved && movie.submittedById !== me.id && !isAdmin)) {
      return NextResponse.json({ error: 'Film se nenašel.' }, { status: 404 });
    }

    const isMember = !!settings?.onlineFreeForAll || !!(me.membershipUntil && me.membershipUntil > new Date());

    // Golden Ticket pravidlo viditeľnosti nového titulu (rovnako ako profil filmu).
    if (!isAdmin && !(await isActiveMember(me.id))) {
      const visibleAt = new Date(new Date(movie.createdAt).getTime() + 2 * 60 * 60 * 1000);
      if (visibleAt > new Date()) return NextResponse.json({ error: 'Tento titul zatím není dostupný.' }, { status: 403 });
    }

    const isSeries = movie.contentType === 'Seriál';
    const [seasons, watchedRows] = await Promise.all([
      isSeries ? getCachedMovieSeasons(movie.id) : Promise.resolve([] as any[]),
      isSeries
        ? prisma.watchedEpisode.findMany({ where: { userId: me.id, episode: { season: { movieId: movie.id } } }, select: { episodeId: true } })
        : Promise.resolve([] as { episodeId: string }[])
    ]);
    const watched = new Set(watchedRows.map((w) => w.episodeId));
    const hasEpisodeLinks = (seasons as any[]).some((s) => (s.episodes || []).some((e: any) => e.onlineUrl));
    const available = !!movie.watchUrl || hasEpisodeLinks;

    // Rovnaké rozhodovanie ako web: seriál s epizódami → prehliadač epizód,
    // inak jeden odkaz na celý film.
    const mode = isSeries && (seasons as any[]).length > 0 && available ? 'episodes' : movie.watchUrl ? 'single' : 'none';

    return NextResponse.json(
      {
        id: movie.id,
        slug: movie.slug,
        title: movie.title,
        originalTitle: movie.originalTitle && movie.originalTitle !== movie.title ? movie.originalTitle : null,
        year: movie.year,
        poster: movie.poster,
        onlineImage: movie.onlineImage || movie.photos[0]?.thumbnail || movie.poster || null,
        isCamVersion: movie.isCamVersion,
        hasSubtitles: movie.hasSubtitles,
        hasDubbing: movie.hasDubbing,
        available,
        access: isMember ? 'member' : 'locked',
        mode,
        watchUrl: isMember ? movie.watchUrl || null : null,
        seasons:
          mode === 'episodes'
            ? (seasons as any[]).map((s) => ({
                number: s.number,
                year: s.year,
                released: s.released,
                episodes: (s.episodes || []).map((e: any) => ({
                  id: e.id,
                  number: e.number,
                  title: e.title,
                  onlineImage: e.onlineImage,
                  // Epizóda bez vlastného odkazu použije odkaz celého seriálu (ako web).
                  onlineUrl: isMember ? e.onlineUrl || movie.watchUrl || null : null,
                  watched: watched.has(e.id)
                }))
              }))
            : []
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[api/mobile/movie-online]', error);
    return NextResponse.json({ error: 'Chyba při načítání.' }, { status: 500 });
  }
}
