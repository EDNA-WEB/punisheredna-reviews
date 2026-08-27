import Link from 'next/link';
import { IconInfo } from './Icons';

type Fan = { id: string; name: string };

export default function FanklubBox({ karma, isAdmin, fans }: { karma: number; isAdmin: boolean; fans: Fan[] }) {
  const shown = fans.slice(0, 20);

  return (
    <div className="border border-line rounded-xl overflow-hidden">
      <div className="text-center py-5 px-4 bg-accent text-white">
        <div className="flex items-center justify-center gap-1.5">
          <span className="font-display font-extrabold text-2xl leading-none">{isAdmin ? '∞' : karma}</span>
          <span className="text-sm opacity-90">karmy</span>
          <span title="Karma — súčet lajkov mínus dislajkov na recenzie, komentáre, novinky a diskusné príspevky">
            <IconInfo className="w-3.5 h-3.5 opacity-80" />
          </span>
        </div>
      </div>

      {fans.length > 0 && (
        <div className="p-4 bg-card">
          <div className="text-xs font-bold text-muted mb-2">Fanklub ({fans.length})</div>
          <div className="space-y-1.5">
            {shown.map((f) => (
              <Link key={f.id} href={`/profile/${f.id}`} className="block text-sm text-accent hover:underline truncate">
                {f.name.startsWith('Zmazaný používateľ ') ? 'Zmazaný používateľ' : f.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
