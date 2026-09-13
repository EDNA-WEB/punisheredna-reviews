import Link from 'next/link';
import { IconCandle } from './Icons';

type Item = { id: string; name: string; slug: string; photo: string | null; birthDate: Date | string | null; deathDate: Date | string | null };

function computeAge(birth: Date, reference: Date): number {
  let age = reference.getFullYear() - birth.getFullYear();
  const beforeBirthdayThisYear = reference.getMonth() < birth.getMonth() || (reference.getMonth() === birth.getMonth() && reference.getDate() < birth.getDate());
  if (beforeBirthdayThisYear) age--;
  return age;
}

// Spoločná, tichšia karta pre "narodeniny"/"úmrtia" — bez veľkého čísla
// poradia (to tu nedáva zmysel), namiesto toho sa vek/rok zobrazí jemne pri
// prejdení myšou, a pri zosnulých pribudne malá ikonka sviečky v rohu fotky.
export default function PersonMemorialGrid({
  title,
  icon,
  items,
  mode
}: {
  title: string;
  icon?: React.ReactNode;
  items: Item[];
  mode: 'birthday' | 'death';
}) {
  if (items.length === 0) return null;
  const today = new Date();

  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h3 className="font-display font-bold text-sm text-ink">{title}</h3>
      </div>
      <div className="flex gap-x-5 gap-y-4 overflow-x-auto snap-x snap-mandatory pb-1 max-w-full">
        {items.map((p, i) => {
          const birth = p.birthDate ? new Date(p.birthDate) : null;
          const death = p.deathDate ? new Date(p.deathDate) : null;
          const badge = mode === 'birthday' && birth ? `${computeAge(birth, today)}` : mode === 'death' && birth && death ? `${computeAge(birth, death)}` : null;

          return (
            <Link
              key={p.id}
              href={`/osobnost/${p.slug}`}
              className={`flex-none snap-start flex-col items-center text-center w-20 group ${i < 5 ? 'flex' : 'hidden sm:flex'}`}
            >
              <div className="relative mb-1.5">
                <div
                  className="w-16 h-16 rounded-lg bg-line bg-cover bg-center shadow-sm group-hover:shadow-md group-hover:ring-2 group-hover:ring-accent transition-all"
                  style={p.photo ? { backgroundImage: `url('${p.photo}')` } : undefined}
                />
                {mode === 'death' && (
                  <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-night text-white flex items-center justify-center border-2 border-card">
                    <IconCandle className="w-2.5 h-2.5" />
                  </span>
                )}
                {badge && (
                  <div className="absolute inset-0 rounded-lg bg-night/75 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white text-[11px] font-bold leading-none text-center px-1">
                      {mode === 'birthday' ? `${badge} r.` : `† ${badge} r.`}
                    </span>
                  </div>
                )}
              </div>
              <span className="text-xs font-semibold text-ink leading-tight group-hover:text-accent transition-colors">{p.name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
