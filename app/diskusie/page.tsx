import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { IconUser } from '@/components/Icons';
import CriticBadge from '@/components/CriticBadge';
import GoldenTicketBadge from '@/components/GoldenTicketBadge';

export const dynamic = 'force-dynamic';

export default async function DiskusiePage() {
  const threads = await prisma.thread.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      author: { select: { id: true, name: true, avatar: true, role: true, membershipUntil: true } },
      movie: { select: { title: true, slug: true } },
      _count: { select: { posts: true } }
    }
  });

  return (
    <div className="pt-8">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="font-display font-extrabold text-3xl text-ink mb-2">Diskusie</h1>
          <p className="text-muted">Založ vlastnú tému alebo sa pridaj do rozprávania o filmoch.</p>
        </div>
        <Link href="/diskusie/new" className="bg-accent text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-accent-dark flex-none">
          + Nová téma
        </Link>
      </div>

      {threads.length === 0 ? (
        <div className="border border-line rounded-xl p-8 text-center text-muted bg-surface">
          Zatiaľ tu nie je žiadna téma. Založ prvú.
        </div>
      ) : (
        <div className="border border-line rounded-xl divide-y divide-line overflow-hidden">
          {threads.map((t) => (
            <Link key={t.id} href={`/diskusie/${t.id}`} className="flex items-center gap-4 p-4 bg-card hover:bg-surface transition-colors">
              {t.author.avatar ? (
                <img src={t.author.avatar} alt={t.author.name} className="w-10 h-10 rounded-full object-cover flex-none" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-surface flex items-center justify-center flex-none">
                  <IconUser className="w-5 h-5 text-muted" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-display font-bold text-ink truncate">{t.title}</div>
                <div className="flex items-center gap-2 text-xs text-muted mt-1 flex-wrap">
                  <span>{t.author.name}</span>
                  {t.author.role === 'ADMIN' && <CriticBadge size="w-3.5 h-3.5" label={false} />}
                  {t.author.membershipUntil && t.author.membershipUntil > new Date() && <GoldenTicketBadge size={14} />}
                  {t.movie && <span>· o filme {t.movie.title}</span>}
                  <span>· {new Date(t.createdAt).toLocaleDateString('sk-SK')}</span>
                </div>
              </div>
              <div className="text-xs font-semibold text-muted flex-none">{t._count.posts} príspevkov</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
