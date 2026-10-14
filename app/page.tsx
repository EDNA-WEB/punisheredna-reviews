import Link from 'next/link';
import { isActiveMember } from '@/lib/membership';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDictionary, getUserLanguage } from '@/lib/i18n';
import { cookies } from 'next/headers';
import { parseConsentCookie, isConsentGranted } from '@/lib/privacyDefaults';
import { img } from '@/lib/homeData';
import { loadHomePage } from '@/lib/homePage';
import HomeHero from '@/components/home/HomeHero';
import HomeTop10 from '@/components/home/HomeTop10';
import HomePosterRow from '@/components/home/HomePosterRow';
import HomeReviews, { type ReviewTab } from '@/components/home/HomeReviews';
import HomePeople from '@/components/home/HomePeople';
import HomeRecent from '@/components/home/HomeRecent';
import HomeSectionHead from '@/components/home/HomeSectionHead';
import { HIcon, Score } from '@/components/home/HomeIcons';
import { HomeWatchlistProvider } from '@/components/home/useWatchlist';

export const dynamic = 'force-dynamic';

// Hlavná stránka — nový vzhľad (štýl ako profily a Box Office). Poradie sekcií
// ostáva ako doteraz: úvod s trailerom → Top 10 → Oblíbené mezi fanoušky →
// Doporučujeme → Novinky → Seriály + Box office víkendu → Recenze →
// (Golden Ticket pre nečlenov) → Osobnosti → Videá + Profily → Naposledy prohlížené.

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  const viewerId: string | null = (session?.user as any)?.id || null;
  const dict = await getDictionary(await getUserLanguage());
  const t = (key: string, fb?: string) => dict[key] || fb || key;
  const isAdmin = (session?.user as any)?.role === 'ADMIN';
  const isMember = isAdmin || (await isActiveMember(viewerId));
  const consent = parseConsentCookie((await cookies()).get('privacy_consent')?.value);
  const personalizationAllowed = isConsentGranted(consent, 'personalization');
  const d = await loadHomePage({ viewerId, isMember, personalizationAllowed });
  const { pulse, trailers, premieres, news, mostRead, series, weekend, videos, profiles } = d;

  const reviewTabs: ReviewTab[] = [
    { key: 'nove', label: t('home.tab_nove', 'Nové'), href: '/recenzie/nove', items: d.reviews.latest },
    { key: 'kritici', label: t('home.tab_kritici', 'Ověření kritici'), href: '/recenzie/kritici', items: d.reviews.critics },
    { key: 'oblubeni', label: t('home.tab_oblubeni', 'Od oblíbených'), href: '/recenzie/oblubencov', items: d.reviews.favorites }
  ].filter((x) => x.items.length > 0);
  const recItems = d.recommendations.items.map((m) => ({ ...m, sub: [m.year, m.genre].filter(Boolean).join(' · ') || null }));
  const fanItems = d.fans.map((m) => ({ ...m, sub: [m.year, m.contentType === 'Seriál' ? t('home2.serial', 'Seriál') : null].filter(Boolean).join(' · ') || null }));
  const recommendations = d.recommendations;
  const top10Items = d.top10.items;
  const showMoves = d.top10.showMoves;
  const { actors, creators, deceased } = d.people;
  const bdays = d.people.birthdays;
  const recentlyViewed = d.recentlyViewed;
  // Spoločný stav „Chci vidět“ pre všetky sekcie
  const watchInit: Record<string, boolean> = {};
  for (const x of trailers) watchInit[x.movie.id] = x.movie.inWatchlist;
  for (const x of [...top10Items, ...d.fans, ...d.recommendations.items, ...recentlyViewed]) watchInit[x.id] = watchInit[x.id] || x.inWatchlist;

  const [lead, ...mids] = news;
  const weekendTop = weekend?.entries || [];
  const wMax = Math.max(1, ...weekendTop.map((e) => e.grossValue || 0));
  const TZ = 'Europe/Prague';
  const dateShort = (iso: string) => new Date(iso).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric', timeZone: TZ });
  const pDay = (x: Date | string) => new Date(x).toLocaleDateString('en-CA', { timeZone: TZ });
  const dayLabel = (iso: string) => {
    if (pDay(iso) === pDay(new Date())) return t('home2.dnes', 'dnes');
    if (pDay(iso) === pDay(new Date(Date.now() - 86400000))) return t('home2.vcera', 'včera');
    return dateShort(iso);
  };
  const more = t('home2.zobrazit_vse', 'Zobrazit vše');

  return (
    <HomeWatchlistProvider initial={watchInit}>
    <div className="pt-5 pb-6 space-y-12 sm:space-y-14">
      {/* 1 — úvod */}
      <HomeHero
        trailers={trailers}
        premieres={premieres}
        pulse={pulse}
        canWatchlist={!!viewerId}
        contest={{ href: '/sutaz/hbo', title: t('home2.soutez_hbo', 'Vyhraj předplatné HBO Max na celý rok') }}
      />

      {/* V kinech brzy — na mobile (na počítači je v úvode) */}
      {premieres.length > 0 && (
        <section className="lg:hidden">
          <HomeSectionHead icon="clock" title={t('home2.v_kinech_brzy', 'V kinech brzy')} href="/kino" moreLabel={more} />
          <div className="hp-row !gap-3">
            {premieres.map((p) => {
              const d = new Date(p.date);
              return (
                <Link key={p.id} href={`/movie/${p.slug}`} className="w-[104px] flex-none">
                  <span className="relative block">
                    {p.poster ? <img src={p.poster} alt={p.title} className="block w-[104px] h-[156px] rounded-[12px] object-cover hp-shadow" loading="lazy" /> : <span className="block w-[104px] h-[156px] rounded-[12px] bg-surface" />}
                    <span className="hp-cal hp-cal-light absolute right-1.5 top-1.5">
                      <b>{d.toLocaleDateString('cs-CZ', { day: 'numeric', timeZone: TZ }).replace('.', '')}</b>
                      <span>{d.toLocaleDateString('cs-CZ', { month: 'short', timeZone: TZ }).replace('.', '')}</span>
                    </span>
                  </span>
                  <span className="block text-[12.5px] font-semibold text-ink truncate mt-1.5">{p.title}</span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* 2 — Top 10 */}
      <HomeTop10 items={top10Items} showMoves={showMoves} />

      {/* 3 — Oblíbené mezi fanoušky */}
      <HomePosterRow icon="heart" title={t('home2.oblibene', 'Oblíbené mezi fanoušky')} sub={t('home2.oblibene_sub', 'Co si lidé nejčastěji přidávají do oblíbených')} href="/oblibene-fanousci" items={fanItems} />

      {/* 4 — Doporučujeme pro tebe */}
      {recItems.length > 0 && (
        <HomePosterRow
          dark
          icon="spark"
          title={t('home2.doporucujeme', 'Doporučujeme pro tebe')}
          sub={t('home2.doporucujeme_sub', 'Podle toho, co jsi hodnotil vysoko — hlavně {0}').replace('{0}', recommendations.topGenres.join(', ').toLowerCase())}
          items={recItems}
        />
      )}

      {/* 5 — Novinky */}
      {lead && (
        <section>
          <HomeSectionHead icon="news" title={t('home.novinky', 'Novinky')} href="/novinky" moreLabel={more} />
          <div className={`grid gap-5 ${mostRead.length ? 'lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)_320px]' : 'lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]'}`}>
            <Link href={`/news/${lead.slug}`} className="hp-lead group">
              {lead.image ? <img src={lead.image} alt="" /> : null}
              <span className="hp-lead-shade" />
              <span className="absolute left-5 right-5 bottom-5 sm:left-6 sm:bottom-6">
                {lead.movieTitle && <span className="ap-chip ap-glass text-white !text-[11px] !py-1 !px-2.5">{lead.movieTitle}</span>}
                <span className="block font-display font-extrabold text-white text-[22px] sm:text-[27px] leading-[1.12] tracking-[-0.015em] mt-3 group-hover:underline decoration-2 underline-offset-4">{lead.title}</span>
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-white/70 text-[12.5px] mt-3">
                  {lead.author && (
                    <>
                      {lead.author.avatar ? <img src={lead.author.avatar} alt="" className="!static !w-[22px] !h-[22px] rounded-full object-cover" /> : null}
                      <b className="text-white/90">{lead.author.name}</b> &middot;
                    </>
                  )}
                  {dayLabel(lead.createdAt)} &middot; {t('home2.min_cteni', '{0} min čtení').replace('{0}', String(lead.minutes))}
                  {lead.comments > 0 && <> &middot; {t('home2.komentaru', '{0} komentářů').replace('{0}', String(lead.comments))}</>}
                </span>
              </span>
            </Link>
            {mids.length > 0 && (
              <div className="grid sm:grid-cols-2 lg:grid-cols-1 lg:grid-rows-2 gap-5">
                {mids.map((n) => (
                  <Link key={n.id} href={`/news/${n.slug}`} className="hp-mid group">
                    {n.image ? <img src={n.image} alt="" /> : null}
                    <span className="hp-lead-shade" />
                    <span className="absolute left-4 right-4 bottom-4">
                      {n.movieTitle && <span className="block text-[11px] font-bold text-[#FF5A62] uppercase tracking-wide truncate">{n.movieTitle}</span>}
                      <span className="block font-display font-bold text-white text-[16px] leading-snug mt-1 line-clamp-2 group-hover:underline">{n.title}</span>
                      <span className="block text-white/60 text-[12px] mt-1">
                        {dayLabel(n.createdAt)} &middot; {t('home2.min', '{0} min').replace('{0}', String(n.minutes))}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            )}
            {mostRead.length > 0 && (
              <div className="ap-card p-2 min-w-0">
                <div className="ap-label px-3 pt-3 pb-1">{t('home2.nejctenejsi', 'Nejčtenější')}</div>
                {mostRead.map((a, i) => (
                  <Link key={a.id} href={a.href} className={`flex gap-3 p-3 group ${i ? 'border-t border-line' : ''}`}>
                    <span className="font-display font-extrabold text-[22px] leading-none text-line w-6 flex-none">{i + 1}</span>
                    <span className="text-[13.5px] font-semibold text-ink leading-snug line-clamp-2 group-hover:text-accent">{a.title}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* 6 — Seriály | Box office víkendu */}
      {(series.length > 0 || weekendTop.length > 0) && (
        <section className="grid lg:grid-cols-2 gap-8">
          {series.length > 0 && (
            <div className="min-w-0">
              <HomeSectionHead icon="tv" title={t('home.najsledovanejsie_serialy', 'Nejsledovanější seriály')} href="/recenzie?types=Seri%C3%A1l&sort=popular" moreLabel={more} />
              <div className="ap-card p-2">
                {series.map((s, i) => (
                  <Link key={s.id} href={`/movie/${s.slug}`} className={`flex items-center gap-3 p-2.5 rounded-xl hover:bg-surface group ${i ? 'border-t border-line rounded-t-none' : ''}`}>
                    <span className={`hp-rk ${i < 3 ? 'hp-rk-top' : ''}`}>{i + 1}</span>
                    {s.poster ? <img src={s.poster} alt="" className="w-[42px] h-[63px] rounded-[8px] object-cover flex-none" loading="lazy" /> : <span className="w-[42px] h-[63px] rounded-[8px] bg-surface flex-none" />}
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14.5px] font-semibold text-ink truncate group-hover:text-accent">{s.title}</span>
                      <span className="block text-[12px] text-muted truncate">
                        {[s.year, s.genre, s.seasons ? t('home2.serii', '{0} sérií').replace('{0}', String(s.seasons)) : null].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                    <Score percent={s.percent} />
                  </Link>
                ))}
              </div>
            </div>
          )}
          {weekendTop.length > 0 && weekend && (
            <div className="min-w-0">
              <HomeSectionHead icon="chart" title={t('home2.box_office_vikendu', 'Box office víkendu')} sub={`USA · ${dateShort(weekend.weekendStart)}–${dateShort(weekend.weekendEnd)}`} href="/box-office/usa" moreLabel={more} />
              <div className="ap-card p-2">
                {weekendTop.map((e, i) => {
                  const row = (
                    <>
                      <span className={`hp-rk ${i < 3 ? 'hp-rk-top' : ''}`}>{e.rank || i + 1}</span>
                      {e.movie?.poster || e.poster ? (
                        <img src={img(e.movie?.poster || e.poster, 42)!} alt="" className="w-[42px] h-[63px] rounded-[8px] object-cover flex-none" loading="lazy" />
                      ) : (
                        <span className="w-[42px] h-[63px] rounded-[8px] bg-surface flex-none" />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2 min-w-0">
                          <span className="text-[14.5px] font-semibold text-ink truncate">{e.movie?.title || e.title}</span>
                          {e.weeks === 1 ? (
                            <span className="hp-new">{t('home2.novinka', 'NOVINKA')}</span>
                          ) : e.weeks ? (
                            <span className="text-[11.5px] text-muted flex-none">{t('home2.tyden', '{0}. týden').replace('{0}', String(e.weeks))}</span>
                          ) : null}
                          {e.grossLabel && <span className="ml-auto text-[14.5px] font-extrabold text-ink tabular-nums flex-none">{e.grossLabel}</span>}
                        </span>
                        <span className="bo-track mt-2">
                          <span className="bo-dom !rounded-full" style={{ width: `${Math.max(3, ((e.grossValue || 0) / wMax) * 100)}%` }} />
                        </span>
                        {e.totalLabel && <span className="block text-[11.5px] text-muted mt-1">{t('home2.celkem', 'celkem')} {e.totalLabel}</span>}
                      </span>
                    </>
                  );
                  const cls = `flex items-center gap-3 p-2.5 ${i ? 'border-t border-line' : ''}`;
                  return e.movie ? (
                    <Link key={i} href={`/movie/${e.movie.slug}`} className={`${cls} rounded-xl hover:bg-surface`}>
                      {row}
                    </Link>
                  ) : (
                    <div key={i} className={cls}>
                      {row}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      )}

      {/* 7 — Recenze */}
      <HomeReviews tabs={reviewTabs} />

      {/* Golden Ticket — len pre nečlenov */}
      {viewerId && !isMember && (
        <section className="hp-gold -mx-5 sm:mx-0">
          <div className="relative grid md:grid-cols-[minmax(0,1fr)_auto] gap-5 items-center px-5 sm:px-9 py-7">
            <div>
              <span className="pf-badge pf-badge-gold uppercase">Golden Ticket</span>
              <div className="font-display font-extrabold text-white text-[24px] sm:text-[30px] leading-tight tracking-[-0.02em] mt-3">
                {t('home2.gold_nadpis', 'Novinky o 10 hodin dřív, Box Office žebříček a časová osa kariér')}
              </div>
              <p className="text-white/65 text-[14px] mt-2">{t('home2.gold_text', 'Podpoř KrálFilmu a odemkni prémiové funkce.')}</p>
            </div>
            <Link href="/nastavenia/clenstvo" className="hp-gold-btn">
              {t('home2.gold_btn', 'Získat Golden Ticket')}
            </Link>
          </div>
        </section>
      )}

      {/* 8 — Osobnosti */}
      <HomePeople
        tabs={[
          { key: 'actors', label: t('home.rotator_herci', 'Herci'), href: '/herci', items: actors },
          { key: 'creators', label: t('home.rotator_tvorcovia', 'Tvůrci'), href: '/tvorcovia', items: creators },
          { key: 'birthdays', label: t('home2.narozeniny_dnes', 'Narozeniny dnes'), items: bdays },
          { key: 'deceased', label: t('home.rotator_zomreli', 'Zemřeli'), items: deceased }
        ]}
      />

      {/* 9 — Videá | Profily */}
      {(videos.length > 0 || profiles.length > 0) && (
        <section className={`grid gap-8 ${videos.length && profiles.length ? 'lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]' : ''}`}>
          {videos.length > 0 && (
            <div className="min-w-0">
              <HomeSectionHead icon="tv" title={t('home.najsledovanejsie_videa', 'Nejsledovanější videa')} />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {videos.map((v) => (
                  <Link key={v.id} href={`/movie/${v.slug}`} className="group">
                    <span className="relative block rounded-[14px] overflow-hidden aspect-video hp-shadow bg-night">
                      {v.image ? <img src={v.image} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" /> : null}
                      <span className="absolute inset-0 bg-black/25" />
                      <span className="hp-vplay">
                        <HIcon name="play" fill className="w-3.5 h-3.5" />
                      </span>
                    </span>
                    <span className="block text-[13.5px] font-semibold text-ink truncate mt-2 group-hover:text-accent">{v.title}</span>
                    <span className="block text-[12px] text-muted">{t('home2.prehrani', '{0} přehrání').replace('{0}', v.views.toLocaleString('cs-CZ'))}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
          {profiles.length > 0 && (
            <div className="min-w-0">
              <HomeSectionHead icon="user" title={t('home2.profily', 'Nejnavštěvovanější profily')} />
              <div className="ap-card p-2">
                {profiles.map((u, i) => (
                  <Link key={u.id} href={`/profile/${u.id}`} className={`flex items-center gap-3 p-2.5 rounded-xl hover:bg-surface group ${i ? 'border-t border-line rounded-t-none' : ''}`}>
                    <span className={`hp-rk ${i < 3 ? 'hp-rk-top' : ''}`}>{i + 1}</span>
                    {u.avatar ? (
                      <img src={u.avatar} alt="" className="w-[38px] h-[38px] rounded-full object-cover flex-none" />
                    ) : (
                      <span className="w-[38px] h-[38px] rounded-full bg-surface flex items-center justify-center text-muted flex-none">
                        <HIcon name="user" className="w-4 h-4" />
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 min-w-0">
                        <span className="text-[14px] font-semibold text-ink truncate group-hover:text-accent">{u.name}</span>
                        {u.critic && <span className="ap-critic">{t('home2.kritik', 'KRITIK')}</span>}
                      </span>
                      <span className="block text-[12px] text-muted truncate">
                        {t('home2.recenzi_hodnoceni', '{0} recenzí · {1} hodnocení').replace('{0}', u.reviews.toLocaleString('cs-CZ')).replace('{1}', u.ratings.toLocaleString('cs-CZ'))}
                      </span>
                    </span>
                    {u.golden && <span className="pf-badge pf-badge-gold !text-[9.5px] !px-2 !py-1 flex-none">GOLDEN</span>}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* 10 — Naposledy prohlížené (vždy dole) */}
      <HomeRecent initialItems={recentlyViewed} />
    </div>
    </HomeWatchlistProvider>
  );
}
