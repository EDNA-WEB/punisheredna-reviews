import { computeBoxOffice, formatMoney } from '@/lib/boxOffice';
import { IconCheck, IconTrendingDown, IconBanknote } from './Icons';
import BoxOfficeBreakdown from './BoxOfficeBreakdown';

export default function BoxOfficeStatus({
  budget,
  marketingBudget,
  boxOffice,
  domesticBoxOffice,
  internationalBoxOffice,
  compact,
  labels
}: {
  budget: number | null;
  marketingBudget: number | null;
  boxOffice: number | null;
  domesticBoxOffice?: number | null;
  internationalBoxOffice?: number | null;
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
  const stats = computeBoxOffice(budget, marketingBudget, boxOffice);
  if (!stats) return null;

  const l = labels || { ciel: 'cieľ', ziskovy: 'Ziskový', nedosiahnute: 'Nedosiahnuté' };
  const pct = Math.min(100, Math.round((stats.ratio || 0) * 100));
  const hasBreakdown = !!(domesticBoxOffice || internationalBoxOffice);

  const diff = stats.earned - stats.target;
  const diffText = stats.success
    ? `+${formatMoney(diff)} ${l.nad_cielom || 'nad cieľom'}`
    : `−${formatMoney(Math.abs(diff))} ${l.do_ciela || 'do cieľa'}`;

  const badge = (
    <span
      className={`inline-flex items-center gap-1 font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap ${
        stats.success ? 'bg-emerald-50 text-emerald-700' : 'bg-danger/10 text-danger'
      } ${hasBreakdown ? 'cursor-help underline decoration-dotted underline-offset-2' : ''}`}
    >
      {stats.success ? <IconCheck className="w-3 h-3 flex-none" /> : <IconTrendingDown className="w-3 h-3 flex-none" />}
      {stats.success ? l.ziskovy : l.nedosiahnute}
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
            domestic={domesticBoxOffice || 0}
            international={internationalBoxOffice || 0}
            success={stats.success}
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

      <div className={`mb-1.5 font-semibold ${stats.success ? 'text-emerald-600' : 'text-danger'}`}>{diffText}</div>

      <div className="h-1.5 rounded-full bg-line overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${stats.success ? 'bg-emerald-500' : 'bg-danger'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
