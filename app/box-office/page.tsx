import Link from 'next/link';
import { getCachedBoxOfficeMovies } from '@/lib/cachedMovieData';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import BoxOfficeRecalculateButton from '@/components/BoxOfficeRecalculateButton';
import Pagination from '@/components/Pagination';
import { formatMoney, computeBoxOffice } from '@/lib/boxOffice';
import { adjustForInflation } from '@/lib/inflation';
import { getDictionary, getUserLanguage } from '@/lib/i18n';
import { isActiveMember } from '@/lib/membership';
import { sharpImage } from '@/lib/imageQuality';
import { getWeekendBoxOffice } from '@/lib/weekendBoxOffice';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 20;
const SORTS = ['trzby', 'inflacia', 'zisk', 'prepadaky'] as const;

const sharp = (url: string | null | undefined, w: number) => (url ? sharpImage(url, w) || url : null);

function weekendLabel(startIso: string, endIso: string) {
  const s = new Date(startIso);
  const e = new Date(endIso);
  return s.getMonth() === e.getMonth() ? `${s.getDate()}.–${e.getDate()}. ${e.getMonth() + 1}.` : `${s.getDate()}. ${s.getMonth() + 1}. – ${e.getDate()}. ${e.getMonth() + 1}.`;
}

// Rubrika Box Office — nový vzhľad (štýl ako profily: filmový úvod, sklenené
// čísla, karty). Žiadne vyskakovacie okná: vysvetlenie výpočtu je trvalo
// v pravom stĺpci a rozpis tržieb (USA / svet) je priamo v pruhu karty.
export default async function BoxOfficePage(props: { searchParams: Promise<{ sort?: string; page?: string }> }) {
  const searchParams = await props.searchParams;
  const dict = await getDictionary(await getUserLanguage());
  const t = (key: string, fb?: string) => dict[key] || fb || key;
  const sort = (SORTS as readonly string[]).includes(searchParams.sort || '') ? (searchParams.sort as string) : 'trzby';
  const page = Math.max(1, Number(searchParams.page) || 1);
  const session = await getServerSession(authOptions);
  const isAdmin = (session?.user as any)?.role === 'ADMIN';
  const isMember = isAdmin || (await isActiveMember((session?.user as any)?.id));

  if (!isMember) {
    return (
      <div className="pt-6 pb-10">
        <section className="ap-hero -mx-5 sm:mx-0">
          <div className="ap-hero-shade" />
          <div className="relative px-5 sm:px-10 py-10 sm:py-12 max-w-[640px]">
            <span className="pf-badge pf-badge-gold uppercase">Golden Ticket</span>
            <h1 className="font-display font-extrabold text-white text-[34px] sm:text-[46px] leading-[1.04] tracking-[-0.025em] mt-3">{t('boxoffice.nadpis')}</h1>
            <p className="text-[15px] leading-relaxed text-white/80 mt-3">{t('boxoffice.len_golden', 'Box Office žebříček je dostupný jen pro Golden Ticket členy.')}</p>
            <Link href="/nastavenia/clenstvo" className="ap-chip ap-chip-red !px-[18px] !py-2.5 !text-[14px] mt-5">
              {t('boxoffice.zistit_viac', 'Zjistit více o členství')}
            </Link>
          </div>
        </section>
      </div>
    );
  }

  const [withoutVod, weekend] = await Promise.all([getCachedBoxOfficeMovies(), getWeekendBoxOffice().catch(() => null)]);

  const withStats = withoutVod.map((m) => {
    const domestic = m.domesticBoxOffice !== null ? Number(m.domesticBoxOffice) : null;
    const international = m.internationalBoxOffice !== null ? Number(m.internationalBoxOffice) : null;
    const stats = computeBoxOffice(
      m.budget !== null ? Number(m.budget) : null,
      m.marketingBudget !== null ? Number(m.marketingBudget) : null,
      m.boxOffice !== null ? Number(m.boxOffice) : null,
      domestic,
      international,
      m.chinaBoxOffice !== null ? Number(m.chinaBoxOffice) : null,
      m.ancillaryRevenue !== null ? Number(m.ancillaryRevenue) : null
    );
    const releaseYear = Number(m.year) || new Date().getFullYear();
    const adjustedEarned = stats ? adjustForInflation(stats.earned, releaseYear) : 0;
    return { movie: m, stats, adjustedEarned, domestic, international };
  });

  const sorted = [...withStats].sort((a, b) => {
    if (sort === 'inflacia') return b.adjustedEarned - a.adjustedEarned;
    if (sort === 'zisk') return (b.stats?.profit ?? -Infinity) - (a.stats?.profit ?? -Infinity);
    if (sort === 'prepadaky') return (a.stats?.profit ?? Infinity) - (b.stats?.profit ?? Infinity);
    return (b.stats?.earned ?? 0) - (a.stats?.earned ?? 0);
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const offset = (currentPage - 1) * PAGE_SIZE;
  const paged = sorted.slice(offset, offset + PAGE_SIZE);

  // Súhrnné čísla a postranné zoznamy
  const counted = withStats.filter((x) => x.stats && x.stats.earned > 0);
  const totalEarned = counted.reduce((n, x) => n + (x.stats?.earned || 0), 0);
  const profitableShare = counted.length ? Math.round((counted.filter((x) => x.stats?.profitable).length / counted.length) * 100) : null;
  const byEarned = [...counted].sort((a, b) => (b.stats?.earned || 0) - (a.stats?.earned || 0));
  const top3 = byEarned.slice(0, 3);
  const flops = [...counted]
    .filter((x) => (x.stats?.profit ?? 0) < 0)
    .sort((a, b) => (a.stats?.profit ?? 0) - (b.stats?.profit ?? 0))
    .slice(0, 3);
  const weekendTop = (weekend?.entries || []).slice(0, 5);

  const sortLabels: Record<string, string> = {
    trzby: t('boxoffice.sort_trzby', 'Tržby'),
    inflacia: t('boxoffice.sort_inflacia', 'Po započtení inflace'),
    zisk: t('boxoffice.sort_zisk', 'Největší zisky'),
    prepadaky: t('boxoffice.sort_prepadaky', 'Největší propadáky')
  };
  const stats = [
    { value: counted.length.toLocaleString('cs-CZ'), label: t('boxoffice.st_filmov', 'filmů v žebříčku') },
    { value: formatMoney(totalEarned), label: t('boxoffice.st_trzby', 'celkové tržby') },
    { value: profitableShare !== null ? `${profitableShare} %` : '–', label: t('boxoffice.st_ziskovych', 'ziskových filmů') },
    { value: top3[0]?.stats ? formatMoney(top3[0].stats.earned) : '–', label: t('boxoffice.st_hit', 'největší hit') }
  ];
  const [first, second, third] = top3;
  const poster = (x: (typeof top3)[number] | undefined, w: number) => sharp(x?.movie.poster, w);

  return (
    <div className="pt-6 pb-10">
      {/* ---------- úvod ---------- */}
      <section className="ap-hero -mx-5 sm:mx-0">
        {first?.movie.poster && <img src={poster(first, 300)!} alt="" aria-hidden="true" className="ap-hero-bg" />}
        <div className="ap-hero-shade" />

        <div className="relative grid gap-7 lg:grid-cols-[minmax(0,1fr)_300px] items-center px-5 sm:px-10 pt-8 sm:pt-10 pb-6">
          <div className="min-w-0">
            <div className="flex flex-wrap gap-2 mb-3">
              <span className="pf-badge pf-badge-gold uppercase">Golden Ticket</span>
              <span className="ap-chip ap-glass text-white !text-[11.5px] !py-[5px] !px-2.5">{t('boxoffice.prubezne', 'Aktualizuje se průběžně')}</span>
            </div>
            <h1 className="font-display font-extrabold text-white text-[34px] sm:text-[46px] leading-[1.04] tracking-[-0.025em]">{t('boxoffice.nadpis')}</h1>
            <p className="text-[14.5px] sm:text-[15px] leading-relaxed text-white/80 mt-2.5 max-w-[560px]">
              {t('boxoffice.uvod', 'Kolik filmy vydělaly v kinech, kolik stály a jestli se studiu vrátily peníze. Žebříček všech filmů v naší databázi.')}
            </p>
            <nav className="flex gap-2 mt-5 overflow-x-auto ap-noscroll -mx-5 px-5 sm:mx-0 sm:px-0" aria-label={t('boxoffice.razeni', 'Řazení')}>
              {SORTS.map((s) => (
                <Link
                  key={s}
                  href={`/box-office?sort=${s}`}
                  aria-current={s === sort ? 'page' : undefined}
                  className={`ap-chip !py-2 !px-3.5 whitespace-nowrap flex-none ${s === sort ? 'bg-white text-[#15171A]' : 'ap-glass text-white hover:bg-white/20'}`}
                >
                  {sortLabels[s]}
                </Link>
              ))}
            </nav>
            <div className="flex flex-wrap items-center gap-2.5 mt-3">
              <Link href="/box-office/porovnanie" className="ap-chip ap-chip-red !px-4 !py-2.5 !text-[13.5px]">
                {t('boxoffice.porovnat', 'Porovnat 2 filmy')}
              </Link>
              <Link href="/box-office/usa" className="ap-chip ap-glass text-white !px-4 !py-2.5 !text-[13.5px] hover:bg-white/20">
                {t('boxoffice.vikend_usa', 'Víkend v USA')} &rarr;
              </Link>
              {isAdmin && <BoxOfficeRecalculateButton />}
            </div>
          </div>

          {first && (
            <div className="hidden lg:block">
              <div className="ap-label !text-white/60 text-center mb-3">{t('boxoffice.top3', 'Top 3 podle tržeb')}</div>
              <div className="relative h-[222px]">
                {second && (
                  <Link href={`/movie/${second.movie.slug}`} className="pf-top pf-top-left !w-[104px] !h-[156px]" title={second.movie.title}>
                    {second.movie.poster ? <img src={poster(second, 104)!} alt={second.movie.title} /> : <span>{second.movie.title}</span>}
                  </Link>
                )}
                {third && (
                  <Link href={`/movie/${third.movie.slug}`} className="pf-top pf-top-right !w-[104px] !h-[156px]" title={third.movie.title}>
                    {third.movie.poster ? <img src={poster(third, 104)!} alt={third.movie.title} /> : <span>{third.movie.title}</span>}
                  </Link>
                )}
                <Link href={`/movie/${first.movie.slug}`} className="pf-top pf-top-main !w-[130px] !h-[195px]" title={first.movie.title}>
                  {first.movie.poster ? <img src={poster(first, 130)!} alt={first.movie.title} /> : <span>{first.movie.title}</span>}
                </Link>
                <span className="absolute left-1/2 top-[182px] -translate-x-1/2 z-[3] bo-pill bo-gold">#1 {formatMoney(first.stats!.earned)}</span>
              </div>
            </div>
          )}
        </div>

        <div className="relative grid ap-glass mx-3 sm:mx-6 mb-4 sm:mb-6 rounded-2xl grid-cols-2 sm:grid-cols-4 bo-stats">
          {stats.map((s) => (
            <div key={s.label} className="pf-stat">
              <div className="font-display font-extrabold text-[17px] sm:text-[24px] tracking-tight text-white tabular-nums">{s.value}</div>
              <div className="text-[11px] sm:text-[12.5px] text-white/65 mt-0.5 leading-tight">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-6 mt-6">
        {/* ---------- zoznam ---------- */}
        <div className="min-w-0">
          {sorted.length === 0 ? (
            <div className="ap-card p-10 text-center text-muted">{t('boxoffice.prazdny_zoznam')}</div>
          ) : (
            <ol className="space-y-3">
              {paged.map(({ movie: m, stats: st, adjustedEarned, domestic, international }, i) => {
                const rank = offset + i + 1;
                const earned = st?.earned || 0;
                const goal = st?.target || 0;
                const scale = Math.max(earned, goal, 1);
                const hasSplit = !!(domestic || international);
                const domW = hasSplit ? ((domestic || 0) / scale) * 100 : 0;
                const intW = hasSplit ? ((international || 0) / scale) * 100 : (earned / scale) * 100;
                const pct = st?.ratio != null ? Math.round(st.ratio * 100) : null;
                const pill = st ? (
                  <span className={`bo-pill ${st.profitable ? 'bo-ok' : 'bo-bad'}`}>
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d={st.profitable ? 'm5 12.5 4.5 4.5L19 7.5' : 'm4 7 6 6 4-4 6 6m0 0v-5m0 5h-5'} />
                    </svg>
                    {st.profitable ? t('boxoffice.ziskovy') : t('boxoffice.ztratovy', 'Ztrátový')}
                  </span>
                ) : null;
                return (
                  <li key={m.id}>
                    <Link href={`/movie/${m.slug}`} className="ap-card bo-row p-3.5 sm:p-4 flex gap-3.5 sm:gap-4 items-center min-w-0">
                      <span className={`bo-rank ${rank <= 3 ? 'bo-rank-top' : ''}`}>{rank}</span>
                      <span className="relative flex-none">
                        {m.poster ? (
                          <img src={sharp(m.poster, 64)!} alt="" className="bo-poster" loading="lazy" />
                        ) : (
                          <span className="bo-poster bg-surface" />
                        )}
                        <span className={`bo-mrank ${rank <= 3 ? 'bo-mrank-top' : ''}`}>{rank}</span>
                      </span>
                      <span className="min-w-0 flex-1 block">
                        <span className="flex items-center gap-2 min-w-0">
                          <span className="font-display font-bold text-[15px] sm:text-[16.5px] text-ink truncate">{m.title}</span>
                          {m.year && <span className="text-[13px] text-muted flex-none">{m.year}</span>}
                          <span className="ml-auto flex-none hidden sm:inline-flex">{pill}</span>
                        </span>
                        <span className="block text-[12.5px] text-muted mt-0.5 truncate">
                          {t('boxoffice.rozpocet')} {formatMoney(Number(m.budget!))}
                          {m.marketingBudget ? ` · ${t('boxoffice.marketing').toLowerCase()} ${formatMoney(Number(m.marketingBudget))}` : ''}
                        </span>
                        {st && (
                          <>
                            <span className="sm:flex sm:items-end gap-3 mt-2 block">
                              <span className="block">
                                <span className="font-display font-extrabold text-[20px] sm:text-[22px] text-ink leading-none tabular-nums">{formatMoney(earned)}</span>
                                <span className="sm:block text-[11.5px] text-muted sm:mt-1 ml-1.5 sm:ml-0">
                                  {sort === 'inflacia' ? `${t('boxoffice.dnes', 'dnes')} ${formatMoney(adjustedEarned)}` : t('boxoffice.celosvetovo_male', 'celosvětově')}
                                </span>
                              </span>
                              <span className="flex items-center gap-2 sm:block sm:ml-auto sm:text-right mt-1 sm:mt-0">
                                <span className={`text-[12.5px] font-semibold ${st.profitable ? 'text-emerald-600' : 'text-danger'}`}>
                                  {st.profitable ? '+' : '−'}
                                  {formatMoney(Math.abs(st.profit))} {st.profitable ? t('boxoffice.zisk_studia', 'zisk studia') : t('boxoffice.strata_studia', 'ztráta studia')}
                                </span>
                                <span className="ml-auto sm:hidden flex-none">{pill}</span>
                              </span>
                            </span>
                            <span className="bo-track mt-2.5">
                              {domW > 0 && <span className="bo-dom" style={{ width: `${domW}%` }} />}
                              {intW > 0 && <span className={`bo-int ${domW > 0 ? '' : 'bo-int-solo'}`} style={{ width: `${intW}%` }} />}
                              {goal > 0 && <span className="bo-goal" style={{ left: `${(goal / scale) * 100}%` }} />}
                            </span>
                            <span className="flex text-[11px] text-muted mt-1.5 gap-3 min-w-0">
                              {hasSplit && (
                                <>
                                  <span className="hidden sm:inline whitespace-nowrap">
                                    <i className="bo-dot bo-dot-dom" />
                                    {t('boxoffice.usa', 'USA')} {formatMoney(domestic || 0)}
                                  </span>
                                  <span className="hidden sm:inline whitespace-nowrap">
                                    <i className="bo-dot bo-dot-int" />
                                    {t('boxoffice.svet', 'Svět')} {formatMoney(international || 0)}
                                  </span>
                                </>
                              )}
                              {pct !== null && (
                                <span className={`sm:ml-auto font-semibold whitespace-nowrap ${st.success ? 'text-emerald-600' : 'text-ink'}`}>
                                  {pct} % {t('boxoffice.z_ciela', 'z cíle')} {formatMoney(goal)}
                                </span>
                              )}
                            </span>
                          </>
                        )}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          )}
          <div className="mt-6">
            <Pagination page={currentPage} totalPages={totalPages} basePath={`/box-office?sort=${sort}`} />
          </div>
        </div>

        {/* ---------- pravý stĺpec ---------- */}
        <aside className="space-y-5 min-w-0">
          <div className="ap-card p-5">
            <div className="ap-label mb-2">{t('boxoffice.jak_nadpis', 'Jak se počítá zisk studia')}</div>
            <p className="text-[13.5px] text-muted leading-relaxed">
              {t('boxoffice.jak_text', 'Kina si nechávají většinu vstupného. Studiu se vrací jen podíl, který se liší podle regionu:')}
            </p>
            <div className="mt-3 text-[13.5px]">
              {[
                [t('boxoffice.jak_usa', 'USA a Kanada'), '50 %'],
                [t('boxoffice.jak_svet', 'Svět bez Číny'), '40 %'],
                [t('boxoffice.jak_cina', 'Čína'), '25 %']
              ].map(([l, v], i) => (
                <div key={l} className={`flex py-2 ${i ? 'border-t border-line' : ''}`}>
                  <span className="text-muted">{l}</span>
                  <b className="ml-auto text-ink">{v}</b>
                </div>
              ))}
            </div>
            <p className="text-[12.5px] text-muted mt-2 pt-3 border-t border-line leading-relaxed">
              {t('boxoffice.jak_pozn', 'Od podílu se odečte rozpočet a marketing, přičtou se příjmy z VOD a TV. Rychlý ukazatel: film by měl v kinech vydělat aspoň 2,5× rozpočet.')}
            </p>
          </div>

          {flops.length > 0 && (
            <div className="ap-card p-5">
              <div className="ap-label mb-2">{t('boxoffice.sort_prepadaky', 'Největší propadáky')}</div>
              {flops.map(({ movie: m, stats: st }) => (
                <Link key={m.id} href={`/movie/${m.slug}`} className="flex items-center gap-3 rounded-xl p-1.5 -mx-1.5 hover:bg-surface group">
                  {m.poster ? (
                    <img src={sharp(m.poster, 34)!} alt="" className="w-[34px] h-[51px] rounded-[6px] object-cover flex-none" loading="lazy" />
                  ) : (
                    <span className="w-[34px] h-[51px] rounded-[6px] bg-surface flex-none" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-semibold text-ink truncate group-hover:text-accent">{m.title}</span>
                    <span className="block text-[12px] text-danger font-semibold">
                      −{formatMoney(Math.abs(st!.profit))} {t('boxoffice.strata', 'ztráta')}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          )}

          {weekendTop.length > 0 && weekend && (
            <div className="ap-card p-5">
              <div className="flex items-center mb-2">
                <div className="ap-label">{t('boxoffice.vikend_usa', 'Víkend v USA')}</div>
                <span className="ml-auto text-[12px] text-muted">{weekendLabel(weekend.weekendStart, weekend.weekendEnd)}</span>
              </div>
              {weekendTop.map((e, i) => {
                const row = (
                  <>
                    <span className="w-5 text-[13px] font-extrabold text-muted flex-none">{e.rank || i + 1}</span>
                    <span className="min-w-0 flex-1 text-[14px] font-semibold text-ink truncate">{e.movie?.title || e.title}</span>
                    {e.grossLabel && <span className="text-[13px] font-bold text-ink tabular-nums flex-none">{e.grossLabel}</span>}
                  </>
                );
                const cls = `flex items-center gap-3 py-2 ${i ? 'border-t border-line' : ''}`;
                return e.movie ? (
                  <Link key={i} href={`/movie/${e.movie.slug}`} className={`${cls} hover:text-accent`}>
                    {row}
                  </Link>
                ) : (
                  <div key={i} className={cls}>
                    {row}
                  </div>
                );
              })}
              <Link href="/box-office/usa" className="block text-[13px] font-semibold text-accent hover:underline mt-2">
                {t('boxoffice.cely_rebricek', 'Celý žebříček')} &rarr;
              </Link>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
