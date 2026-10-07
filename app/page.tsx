import Top10Home from '@/components/Top10Home';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { publishedNewsFilterForMember, movieVisibleFilter } from '@/lib/publishedFilter';
import { isActiveMember } from '@/lib/membership';
import { youtubeVideoId } from '@/lib/markdown';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import TrailerCarousel from '@/components/TrailerCarousel';
import PremieresList from '@/components/PremieresList';
import MovieMiniList from '@/components/MovieMiniList';
import ReviewPreviewCard from '@/components/ReviewPreviewCard';
import PeopleRotator from '@/components/PeopleRotator';
import { getBirthdaysToday } from '@/lib/peopleToday';
import TopVideosList from '@/components/TopVideosList';
import TopVisitedUsersList from '@/components/TopVisitedUsersList';
import { getVerifiedCriticIds } from '@/lib/criticStatus';
import { getDictionary, getUserLanguage } from '@/lib/i18n';
import { cookies } from 'next/headers';
import { parseConsentCookie, isConsentGranted } from '@/lib/privacyDefaults';
import { getRecommendationsForUser } from '@/lib/recommendations';
import MovieCard from '@/components/MovieCard';
import { primaryGenreLabel } from '@/lib/genreLabel';
import WeekendBoxOffice from '@/components/WeekendBoxOffice';
import { getWeekendBoxOffice } from '@/lib/weekendBoxOffice';
import { getRecentlyViewedSafe } from '@/lib/recentlyViewed';
import RecentlyViewedSection from '@/components/RecentlyViewedSection';
import HomeReviewsTabs from '@/components/HomeReviewsTabs';
import { getFanFavorites, FAN_ROW_LIMIT } from '@/lib/fanFavorites';
import FanFavoritesSection from '@/components/FanFavoritesSection';

export const dynamic = 'force-dynamic';

// Recenzia na hlavnej stránke: len to, čo karta zobrazuje.
const HOME_REVIEW_SELECT = {
  id: true,
  body: true,
  authorId: true,
  movieId: true,
  movie: { select: { slug: true, title: true, year: true, poster: true } },
  author: { select: { id: true, name: true, avatar: true, membershipUntil: true } }
} as const;

type HomeReview = {
  id: string;
  body: string;
  authorId: string;
  movieId: string;
  movie: { slug: string; title: string; year: string | null; poster: string | null };
  author: { id: string; name: string; avatar: string | null; membershipUntil: Date | null };
};

// Doplní ku každej recenzii hodnotenie jej autora (tvar movie.ratings ostáva
// rovnaký ako predtým, takže vykresľovanie sa nemení).
async function attachAuthorRatings(groups: HomeReview[][]) {
  const all = groups.flat();
  const pairs = Array.from(new Map(all.map((r) => [`${r.movieId}:${r.authorId}`, { movieId: r.movieId, userId: r.authorId }])).values());
  const ratings = pairs.length
    ? await prisma.rating.findMany({
        where: { seasonId: null, episodeId: null, OR: pairs },
        select: { movieId: true, userId: true, value: true }
      })
    : [];
  const byKey = new Map(ratings.map((r) => [`${r.movieId}:${r.userId}`, r]));
  return groups.map((list) =>
    list.map((r) => {
      const own = byKey.get(`${r.movieId}:${r.authorId}`);
      return { ...r, movie: { ...r.movie, ratings: own ? [{ userId: own.userId, value: own.value }] : [] } };
    })
  );
}

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  const viewerId = (session?.user as any)?.id;
  const language = await getUserLanguage();
  const dict = await getDictionary(language);
  const t = (key: string) => dict[key] || key;
  const isAdmin = (session?.user as any)?.role === 'ADMIN';
  const isMember = isAdmin || (await isActiveMember(viewerId));
  const newsFilter = publishedNewsFilterForMember(isMember);

  const [trailerVideos, news, latestReviewsRaw, recentMovies, popularSeries, following] = await Promise.all([
    // Titulky sa pre 20 kandidátov nenačítavajú — len ich počet. Text titulkov
    // sa dotiahne nižšie iba pre 5 trailerov, ktoré sa naozaj zobrazia.
    prisma.movieVideo.findMany({
      where: { category: 'trailer', featuredOnHome: true, episodeId: null, seasonId: null, movie: { approved: true } },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        title: true,
        url: true,
        previewImage: true,
        createdAt: true,
        movie: { select: { title: true, poster: true } },
        _count: { select: { subtitles: true } }
      }
    }),
    prisma.newsPost.findMany({
      where: newsFilter,
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, slug: true, title: true, summary: true, coverImage: true, createdAt: true }
    }),
    prisma.review.findMany({
      where: { movie: { approved: true }, seasonId: null, episodeId: null },
      orderBy: { createdAt: 'desc' },
      take: 4,
      select: HOME_REVIEW_SELECT
    }),
    prisma.movie.findMany({
      where: { approved: true, ...movieVisibleFilter(isMember) },
      orderBy: { createdAt: 'desc' },
      take: 7,
      select: { id: true, title: true, slug: true, year: true, poster: true, genres: true, countries: true }
    }),
    prisma.movie.findMany({
      where: { approved: true, contentType: 'Seriál', ...movieVisibleFilter(isMember) },
      orderBy: { ratings: { _count: 'desc' } },
      take: 5,
      select: { id: true, title: true, slug: true, year: true, poster: true, genres: true, countries: true }
    }),
    viewerId ? prisma.follow.findMany({ where: { followerId: viewerId }, select: { followingId: true } }) : []
  ]);

  const recommendations = viewerId ? await getRecommendationsForUser(viewerId) : { movies: [], topGenres: [] };
  // Nedávno prohlížené (spoločné s appkou) — len pre prihláseného.
  const [recentlyViewed, fanData] = await Promise.all([getRecentlyViewedSafe(viewerId), getFanFavorites(viewerId)]);
  const fanFavorites = fanData.items.slice(0, FAN_ROW_LIMIT);

  const trailerPick = [...trailerVideos]
    .sort((a, b) => {
      const aHas = a._count.subtitles > 0 ? 1 : 0;
      const bHas = b._count.subtitles > 0 ? 1 : 0;
      if (aHas !== bHas) return bHas - aHas;
      // "new Date(...)" tu funguje bezpečne, aj keď dáta prišli z cachovanej
      // funkcie (unstable_cache serializuje cez JSON, takže Date objekty sa
      // zmenia na reťazce — priame ".getTime()" na nich by zlyhalo).
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    })
    .slice(0, 5);
  const pickedSubtitles = trailerPick.length
    ? await prisma.videoSubtitle.findMany({
        where: { movieVideoId: { in: trailerPick.map((v) => v.id) } },
        orderBy: { startTime: 'asc' },
        select: { movieVideoId: true, startTime: true, endTime: true, text: true }
      })
    : [];
  const trailers = trailerPick
    .map((v) => ({
      id: v.id,
      title: v.title || v.movie.title,
      youtubeUrl: v.url,
      youtubeId: youtubeVideoId(v.url),
      subtitles: pickedSubtitles
        .filter((st) => st.movieVideoId === v.id)
        .map((st) => ({ startTime: st.startTime, endTime: st.endTime, text: st.text })),
      posterImage: v.previewImage || v.movie.poster
    }))
    .filter((v) => v.youtubeId) as {
    id: string;
    title: string;
    youtubeUrl: string;
    youtubeId: string;
    subtitles: { startTime: number; endTime: number; text: string }[];
    posterImage: string | null;
  }[];

  const consent = parseConsentCookie((await cookies()).get('privacy_consent')?.value);
  const personalizationAllowed = isConsentGranted(consent, 'personalization');

  const followingIds = following.map((f) => f.followingId);
  const favoriteReviewsRaw = followingIds.length && personalizationAllowed
    ? await prisma.review.findMany({
        where: { authorId: { in: followingIds }, movie: { approved: true }, seasonId: null, episodeId: null },
        orderBy: { createdAt: 'desc' },
        take: 4,
        select: HOME_REVIEW_SELECT
      })
    : [];

  const verifiedCriticIds = await getVerifiedCriticIds();
  const criticReviewsRaw = verifiedCriticIds.size
    ? await prisma.review.findMany({
        where: { authorId: { in: Array.from(verifiedCriticIds) }, movie: { approved: true }, seasonId: null, episodeId: null },
        orderBy: { createdAt: 'desc' },
        take: 4,
        select: HOME_REVIEW_SELECT
      })
    : [];

  // Hodnotenie autora recenzie k danému filmu — jeden malý dopyt pre všetky
  // zobrazené recenzie naraz (predtým sa ku každému filmu ťahali VŠETKY jeho
  // hodnotenia aj s celým riadkom filmu).
  const [latestReviews, favoriteReviews, criticReviews] = await attachAuthorRatings([
    latestReviewsRaw,
    favoriteReviewsRaw,
    criticReviewsRaw
  ]);

  const [topActors, topCreators] = await Promise.all([
    prisma.person.findMany({
      where: { role: 'ACTOR', approved: true, photo: { not: null } },
      orderBy: { followers: { _count: 'desc' } },
      take: 8,
      select: { id: true, name: true, slug: true, photo: true }
    }),
    prisma.person.findMany({
      where: { role: 'CREATOR', approved: true, photo: { not: null } },
      orderBy: { followers: { _count: 'desc' } },
      take: 8,
      select: { id: true, name: true, slug: true, photo: true }
    })
  ]);

  // "Dnes slávia narodeniny" — zdieľané s appkou (lib/peopleToday.ts, cache 1 h).
  const birthdaysToday = await getBirthdaysToday(8);

  // Víkendový box office z GitHub bota — cachované 10 h (lib/weekendBoxOffice.ts).
  const weekendBoxOffice = await getWeekendBoxOffice();

  const recentlyDeceasedRaw = await prisma.person.findMany({
    where: { approved: true, deathDate: { not: null }, photo: { not: null } },
    orderBy: { deathDate: 'desc' },
    take: 20,
    select: { id: true, name: true, slug: true, photo: true, birthDate: true, deathDate: true }
  });
  // Ochrana proti duplicitným záznamom tej istej osoby v databáze (napr. ak
  // bola omylom pridaná dvakrát) — v zozname na hlavnej stránke sa ukáže len
  // raz, podľa najnovšieho úmrtia. Skutočný duplicitný záznam treba nájsť a
  // odstrániť/zlúčiť v Administrácia → Osobnosti.
  const seenDeceasedNames = new Set<string>();
  const recentlyDeceased = recentlyDeceasedRaw
    .filter((p) => {
      if (seenDeceasedNames.has(p.name)) return false;
      seenDeceasedNames.add(p.name);
      return true;
    })
    .slice(0, 8);

  const firstGenre = (g: string | null) => (g || '').split(',').map((x) => x.trim()).filter(Boolean)[0] || null;

  // Recenzie — jedna sekcia so záložkami (namiesto troch boxov pod sebou).
  const reviewGrid = (list: typeof latestReviews, critic = false) => (
    <div className="flex sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-4 overflow-x-auto sm:overflow-visible snap-x snap-mandatory pb-1 [scrollbar-width:none]">
      {list.slice(0, 4).map((r) => {
        const myRating = r.movie.ratings.find((rt) => rt.userId === r.authorId);
        return (
          <div key={r.id} className="flex-none w-[78%] sm:w-auto snap-start">
            <ReviewPreviewCard
              slug={r.movie.slug}
              body={r.body}
              author={r.author}
              rating={myRating?.value || 0}
              movieTitle={r.movie.title}
              movieYear={r.movie.year}
              moviePoster={r.movie.poster}
              showCriticBadge={critic}
            />
          </div>
        );
      })}
    </div>
  );
  const reviewTabs = [
    latestReviews.length > 0 && { key: 'nove', label: t('home.tab_nove'), href: '/recenzie/nove', content: reviewGrid(latestReviews) },
    criticReviews.length > 0 && { key: 'kritici', label: t('home.tab_kritici'), href: '/recenzie/kritici', content: reviewGrid(criticReviews, true) },
    favoriteReviews.length > 0 && { key: 'oblubeni', label: t('home.tab_oblubeni'), href: '/recenzie/oblubencov', content: reviewGrid(favoriteReviews as typeof latestReviews) }
  ].filter(Boolean) as { key: string; label: string; href: string; content: React.ReactNode }[];

  // Poradie a rozostupy hlavnej stránky (návrh v2): všade rovnaká medzera
  // medzi sekciami (space-y-10), sekcie samy vonkajšie okraje nemajú.
  return (
    <div className="pt-6 space-y-10">
      {/* 1 — Trailer | V kinech brzy + súťaž (rovnaká výška oboch stĺpcov) */}
      <div className="lg:flex lg:gap-6 lg:items-stretch">
        <div className="w-full lg:w-[600px] lg:flex-none">
          <TrailerCarousel trailers={trailers} />
        </div>
        <div className="hidden lg:flex flex-col gap-4 flex-1 min-w-0">
          <PremieresList />
          <Link href="/sutaz/hbo" className="block relative rounded-xl overflow-hidden group">
            <img src="/sutaz-hbo-banner.jpg" alt="Soutěž o předplatné HBO na celý rok" className="w-full block" />
            <img
              src="/sutaz-hbo-banner-hover.jpg"
              alt=""
              className="w-full block absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            />
          </Link>
        </div>
      </div>

      <div className="lg:hidden">
        <PremieresList />
      </div>

      {/* 2 — Top 10 tento týden */}
      <Top10Home viewerId={viewerId} />

      {/* 3 — Oblíbené mezi fanoušky */}
      {fanFavorites.length > 0 && <FanFavoritesSection initialItems={fanFavorites} />}

      {recommendations.movies.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display font-extrabold text-xl text-ink">Odporúčame pre teba</h2>
              <p className="text-xs text-muted mt-0.5">
                Podle toho, co jsi dosud hodnotil vysoko — hlavně {recommendations.topGenres.join(', ').toLowerCase()}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-5 gap-y-9">
            {recommendations.movies.map((m) => (
              <MovieCard
                key={m.id}
                movie={{
                  title: m.title,
                  slug: m.slug,
                  poster: m.poster,
                  year: m.year,
                  percent: m.percent,
                  ratingCount: m.ratings.length,
                  genre: primaryGenreLabel((m.genres || '').split(',').map((g) => g.trim()).filter(Boolean)),
                  hasSubtitles: m.hasSubtitles,
                  hasDubbing: m.hasDubbing,
                  releaseDate: m.releaseDate,
                  isCamVersion: m.isCamVersion,
                  contentType: m.contentType,
                  premiereType: m.premiereDates[0]?.type || null
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* 4 — Novinky | Nejsledovanější seriály (rovnaká výška) */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="border border-line rounded-xl p-4 sm:p-5 bg-card min-w-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-base text-ink">{t('home.novinky')}</h2>
            <Link href="/novinky" className="text-[11px] font-semibold text-white bg-accent px-2.5 py-1 rounded-full hover:bg-accent-dark">
              {t('home.viac')}
            </Link>
          </div>

          {news.length === 0 ? (
            <p className="text-sm text-muted">Zatím žádné novinky.</p>
          ) : (
            <div className="divide-y divide-line">
              {news.map((n) => (
                <Link key={n.id} href={`/news/${n.slug}`} className="flex gap-3 group py-3 first:pt-0 last:pb-0">
                  <div
                    className="w-20 h-20 rounded-lg bg-surface bg-cover bg-center flex-none"
                    style={n.coverImage ? { backgroundImage: `url('${n.coverImage}')` } : undefined}
                  />
                  <div className="min-w-0">
                    <div className="text-[11px] text-muted mb-0.5">{new Date(n.createdAt).toLocaleDateString('cs-CZ')}</div>
                    <h3 className="text-sm font-semibold text-ink leading-snug group-hover:text-accent transition-colors line-clamp-2">{n.title}</h3>
                    <p className="text-xs text-muted line-clamp-1 mt-0.5">{n.summary}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <MovieMiniList
          title={t('home.najsledovanejsie_serialy')}
          moreHref="/recenzie?types=Seri%C3%A1l&sort=popular"
          moreLabel={t('home.viac')}
          items={popularSeries.map((s) => ({ id: s.id, title: s.title, slug: s.slug, year: s.year, poster: s.poster, genre: firstGenre(s.genres), country: s.countries }))}
        />
      </div>

      {/* 5 — Recenze (záložky Nové / Ověření kritici / Od oblíbených) */}
      {reviewTabs.length > 0 && <HomeReviewsTabs title={t('home.recenzie_nadpis')} moreLabel={t('home.viac')} tabs={reviewTabs} />}

      {/* 6 — Herci / tvůrci / narozeniny / zemřeli (pomenované záložky) */}
      <PeopleRotator
        moreLabel={t('home.viac')}
        tabs={[
          { key: 'actors', label: t('home.rotator_herci'), title: t('home.najsledovanejsi_herci'), moreHref: '/herci', items: topActors },
          { key: 'creators', label: t('home.rotator_tvorcovia'), title: t('home.najsledovanejsi_tvorcovia'), moreHref: '/tvorcovia', items: topCreators },
          { key: 'birthdays', label: t('home.rotator_narodeniny'), title: t('home.dnes_slavia_narodeniny'), items: birthdaysToday },
          { key: 'deceased', label: t('home.rotator_zomreli'), title: t('home.naposledy_zomreli'), items: recentlyDeceased }
        ]}
      />

      {/* 7 — Top box office (USA) */}
      <WeekendBoxOffice data={weekendBoxOffice} t={t} />

      <div className="grid sm:grid-cols-2 gap-4 empty:hidden">
        <TopVideosList />
        <TopVisitedUsersList />
      </div>

      {/* 8 — Nedávno prohlížené (vždy dole) */}
      {recentlyViewed.length > 0 && <RecentlyViewedSection initialItems={recentlyViewed} />}
    </div>
  );
}
