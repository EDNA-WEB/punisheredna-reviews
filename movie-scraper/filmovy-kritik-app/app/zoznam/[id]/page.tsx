import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { IconUser } from '@/components/Icons';
import MovieListGrid from '@/components/MovieListGrid';
import DeleteMovieListButton from '@/components/DeleteMovieListButton';

export const dynamic = 'force-dynamic';

export default async function MovieListPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const viewerId = (session?.user as any)?.id;

  const list = await prisma.movieList.findUnique({
    where: { id: params.id },
    include: {
      author: { select: { id: true, name: true, avatar: true } },
      items: {
        orderBy: { order: 'asc' },
        include: { movie: { select: { id: true, title: true, slug: true, poster: true, year: true } } }
      }
    }
  });
  if (!list) return notFound();

  const isOwn = list.authorId === viewerId;

  return (
    <div className="pt-10 max-w-3xl">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-2">
        <h1 className="font-display font-extrabold text-3xl text-ink">{list.title}</h1>
        {isOwn && <DeleteMovieListButton listId={list.id} />}
      </div>
      <Link href={`/profile/${list.author.id}`} className="flex items-center gap-2 text-sm text-muted hover:text-accent mb-8 w-fit">
        {list.author.avatar ? (
          <img src={list.author.avatar} alt={list.author.name} className="w-6 h-6 rounded-full object-cover" />
        ) : (
          <IconUser className="w-4 h-4" />
        )}
        {list.author.name} · {list.items.length} filmov
      </Link>

      <MovieListGrid listId={list.id} initialItems={list.items} isOwn={isOwn} />
    </div>
  );
}
