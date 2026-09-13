import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import EmptyState from '@/components/EmptyState';
import { IconNote } from '@/components/Icons';

export const dynamic = 'force-dynamic';

export default async function NotesPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');
  const viewerId = (session.user as any).id;

  const notes = await prisma.movieNote.findMany({
    where: { userId: viewerId },
    orderBy: { updatedAt: 'desc' },
    include: { movie: { select: { title: true, slug: true, poster: true, year: true } } }
  });

  return (
    <div className="pt-8">
      <h1 className="font-display font-extrabold text-3xl text-ink mb-2">Poznámky</h1>
      <p className="text-muted mb-8">Súkromné poznámky, ktoré si napísal k filmom — vidíš ich len ty.</p>

      {notes.length === 0 ? (
        <EmptyState
          icon={<IconNote className="w-5 h-5" />}
          title="Zatiaľ žiadne poznámky"
          description="Pridaj si nejakú priamo na stránke filmu."
          actionLabel="Prezrieť filmy"
          actionHref="/recenzie"
        />
      ) : (
        <div className="space-y-4">
          {notes.map((n) => (
            <Link
              key={n.id}
              href={`/movie/${n.movie.slug}`}
              className="flex gap-4 border border-line rounded-xl p-4 bg-card hover:border-accent transition-colors"
            >
              <div
                className="w-14 h-20 rounded bg-surface bg-cover bg-center flex-none"
                style={n.movie.poster ? { backgroundImage: `url('${n.movie.poster}')` } : undefined}
              />
              <div className="min-w-0 flex-1">
                <div className="font-display font-bold text-ink">
                  {n.movie.title} {n.movie.year && <span className="text-muted font-normal">· {n.movie.year}</span>}
                </div>
                <p className="text-sm text-muted mt-1.5 whitespace-pre-wrap line-clamp-3">{n.body}</p>
                <div className="text-[11px] text-muted mt-2">
                  Upravené {new Date(n.updatedAt).toLocaleDateString('sk-SK')}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
