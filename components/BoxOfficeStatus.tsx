import { computeBoxOffice, formatMoney } from '@/lib/boxOffice';
import { IconCheck, IconTrendingDown, IconBanknote } from './Icons';
import BoxOfficeBreakdown from './BoxOfficeBreakdown';

export default function BoxOfficeStatus({
  budget,
  marketingBudget,
  boxOffice,
  domesticBoxOffice,
  internationalBoxOffice,
  chinaBoxOffice,
  ancillaryRevenue,
  compact,
  labels
}: {
  budget: number | bigint | null;
  marketingBudget: number | bigint | null;
  boxOffice: number | bigint | null;
  domesticBoxOffice?: number | bigint | null;
  internationalBoxOffice?: number | bigint | null;
  chinaBoxOffice?: number | bigint | null;
  ancillaryRevenue?: number | bigint | null;
  compact?: boolean;
  labels?: {
    ciel: string;
    ziskovy: string;
    nedosiahnute: string;
    nad_cielom?: string;
    do_ciela?: string;
    domace?: string;
    medzinarodne?: string;
    celosvetovo?: string;
    vsetky_uvedenia?: string;
  };
}) {
  const budgetN = budget !== null ? Number(budget) : null;
  const marketingBudgetN = marketingBudget !== null ? Number(marketingBudget) : null;
  const boxOfficeN = boxOffice !== null ? Number(boxOffice) : null;
  const domesticBoxOfficeN = domesticBoxOffice != null ? Number(domesticBoxOffice) : domesticBoxOffice;
  const internationalBoxOfficeN = internationalBoxOffice != null ? Number(internationalBoxOffice) : internationalBoxOffice;
  const chinaBoxOfficeN = chinaBoxOffice != null ? Number(chinaBoxOffice) : null;
  const ancillaryRevenueN = ancillaryRevenue != null ? Number(ancillaryRevenue) : null;

  const stats = computeBoxOffice(
    budgetN,
    marketingBudgetN,
    boxOfficeN,
    domesticBoxOfficeN ?? null,
    internationalBoxOfficeN ?? null,
    chinaBoxOfficeN,
    ancillaryRevenueN
  );
  if (!stats) return null;

  const l = labels || { ciel: 'cieľ', ziskovy: 'Ziskový', nedosiahnute: 'Stratový' };
  const pct = Math.min(100, Math.round((stats.ratio || 0) * 100));
  const hasBreakdown = !!(domesticBoxOfficeN || internationalBoxOfficeN);

  const profitText = stats.profitable
    ? `+${formatMoney(stats.profit)} ${l.nad_cielom || 'zisk štúdia'}`
    : `−${formatMoney(Math.abs(stats.profit))} ${l.do_ciela || 'strata štúdia'}`;

  const badge = (
    <span
      className={`inline-flex items-center gap-1 font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap ${
        stats.profitable ? 'bg-emerald-50 text-emerald-700' : 'bg-danger/10 text-danger'
      } ${hasBreakdown ? 'cursor-help underline decoration-dotted underline-offset-2' : ''}`}
    >
      {stats.profitable ? <IconCheck className="w-3 h-3 flex-none" /> : <IconTrendingDown className="w-3 h-3 flex-none" />}
      {stats.profitable ? l.ziskovy : l.nedosiahnute}
    </span>
  );

  return (
    <div className={compact ? 'text-[11px]' : 'text-sm'}>
      <div className="flex items-center justify-between gap-1.5 mb-1 flex-wrap">
        <span className="text-muted whitespace-nowrap inline-flex items-center gap-1">
          <IconBanknote className="w-3 h-3 text-emerald-600 flex-none" />
          {formatMoney(stats.earned)}
          {!compact && <> <span className="text-line">/</span> {l.ciel} {formatMoney(stats.target)}</>}
        </span>
        {hasBreakdown ? (
          <BoxOfficeBreakdown
            domestic={domesticBoxOfficeN || 0}
            international={internationalBoxOfficeN || 0}
            success={stats.profitable}
            labels={{
              domace: l.domace || 'Domáce',
              medzinarodne: l.medzinarodne || 'Medzinárodné',
              celosvetovo: l.celosvetovo || 'Celosvetovo',
              vsetky_uvedenia: l.vsetky_uvedenia || 'Všetky uvedenia'
            }}
          >
            {badge}
          </BoxOfficeBreakdown>
        ) : (
          badge
        )}
      </div>

      <div className={`mb-1 font-semibold ${stats.profitable ? 'text-emerald-600' : 'text-danger'}`}>{profitText}</div>

      {!compact && (
        <div className="text-[11px] text-muted mb-1.5 leading-snug">
          Podiel štúdia z kín {formatMoney(stats.studioTheatricalRevenue)}
          {stats.ancillaryRevenue > 0 && <> + sekundárne príjmy {formatMoney(stats.ancillaryRevenue)}</>}
          {' '}− náklady {formatMoney(stats.totalCost)}
        </div>
      )}

      <div className="h-1.5 rounded-full bg-line overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${stats.success ? 'bg-emerald-500' : 'bg-danger'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {!compact && (
        <div className="text-[10px] text-muted mt-1">
          Rýchly odhad bodu zvratu (2,5× rozpočtu): {pct}%
        </div>
      )}
    </div>
  );
}
