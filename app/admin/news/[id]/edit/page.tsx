import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect, notFound } from 'next/navigation';
import NewsForm from '@/components/NewsForm';
import RevisionHistory from '@/components/RevisionHistory';

export default async function EditNewsPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') redirect('/login');

  const news = await prisma.newsPost.findUnique({ where: { id: params.id } });
  if (!news) return notFound();

  return (
    <div className="pt-8">
      <div className="text-xs font-semibold text-accent uppercase tracking-wider mb-1">Administrácia</div>
      <h1 className="font-display font-extrabold text-3xl text-ink mb-6">Upraviť novinku</h1>
      <div className="mb-6 max-w-2xl">
        <RevisionHistory apiBase={`/api/news/${news.id}`} />
      </div>
      <NewsForm initial={{ ...news, publishAt: news.publishAt ? news.publishAt.toISOString() : null }} />
    </div>
  );
}
