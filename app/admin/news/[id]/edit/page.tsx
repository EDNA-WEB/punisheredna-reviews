import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect, notFound } from 'next/navigation';
import NewsForm from '@/components/NewsForm';
import RevisionHistory from '@/components/RevisionHistory';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

export default async function EditNewsPage(props: { params: Promise<{ id: string }> }) {
  const { params } = { ...props, params: await props.params };
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') redirect('/login');

  const news = await prisma.newsPost.findUnique({ where: { id: params.id } });
  if (!news) return notFound();

  const relatedMovie = news.movieId
    ? await prisma.movie.findUnique({ where: { id: news.movieId }, select: { title: true, year: true } })
    : null;
  const movieTitle = relatedMovie ? `${relatedMovie.title}${relatedMovie.year ? ` (${relatedMovie.year})` : ''}` : null;

  return (
    <div className="admin-page">
      <AdminPageHeader title={<>Upravit novinku</>} />
      <div className="mb-6 max-w-2xl">
        <RevisionHistory apiBase={`/api/news/${news.id}`} />
      </div>
      <NewsForm initial={{ ...news, publishAt: news.publishAt ? news.publishAt.toISOString() : null, movieTitle }} />
    </div>
  );
}
