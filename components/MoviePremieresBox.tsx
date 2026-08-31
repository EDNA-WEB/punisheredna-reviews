import FlagCZ from './FlagCZ';
import FlagUS from './FlagUS';
import FlagGB from './FlagGB';
import FlagSK from './FlagSK';

const FLAGS: Record<string, React.ComponentType<{ className?: string }>> = {
  CZ: FlagCZ,
  US: FlagUS,
  GB: FlagGB,
  SK: FlagSK
};

type PremiereItem = { id: string; country: string; releaseDate: Date; distributor: string | null };

export default function MoviePremieresBox({ ageRating, premieres }: { ageRating: string | null; premieres: PremiereItem[] }) {
  if (premieres.length === 0 && !ageRating) return null;

  return (
    <div className="border border-line rounded-xl overflow-hidden">
      <div className="bg-surface px-4 py-2.5 font-display font-bold text-sm text-ink">Premiéry</div>
      <div className="p-4 space-y-3">
        {ageRating && <p className="text-xs text-muted">{ageRating}</p>}
        {premieres.map((p) => {
          const Flag = FLAGS[p.country];
          return (
            <div key={p.id} className="flex items-start gap-2">
              {Flag ? <Flag className="w-5 h-3.5 mt-0.5" /> : <span className="w-5 h-3.5 mt-0.5 rounded-[2px] bg-line flex-none" />}
              <div className="min-w-0">
                <div className="text-sm font-semibold text-ink">V kinách od</div>
                <div className="text-xs text-muted">
                  {String(p.releaseDate.getDate()).padStart(2, '0')}.{String(p.releaseDate.getMonth() + 1).padStart(2, '0')}.{p.releaseDate.getFullYear()}
                  {p.distributor && <> {p.distributor}</>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
