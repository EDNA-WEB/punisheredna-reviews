import Pagination from '@/components/Pagination';
import { prisma } from '@/lib/prisma';
import { publishedNewsFilter } from '@/lib/publishedFilter';
import NewsCard from '@/components/NewsCard';
import { getDictionary, getUserLanguage } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 9;

export default async function AllNewsPage({ searchParams }: { searchParams: { page?: string } }) {
  const page = Math.max(1, Number(searchParams?.page) || 1);
  const dict = await getDictionary(await getUserLanguage());

  const [news, total] = await Promise.all([
    prisma.newsPost.findMany({
      where: publishedNewsFilter(),
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { _count: { select: { comments: true } } }
    }),
    prisma.newsPost.count({ where: publishedNewsFilter() })
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="pt-8">
      <h1 className="font-display font-extrabold text-3xl text-ink mb-8">{dict['home.novinky']}</h1>

      {news.length === 0 ? (
        <div className="border border-line rounded-xl p-12 text-center text-muted bg-surface">
          Zatiaľ žiadne novinky.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-5 gap-y-8 mb-8">
            {news.map((n, i) => (
              <NewsCard
                key={n.id}
                news={{ ...n, createdAt: n.createdAt.toISOString() }}
                isLatest={page === 1 && i === 0}
                commentCount={n._count.comments}
                novinkaLabel={dict['news.novinka_odznak']}
              />
            ))}
          </div>

          {totalPages > 1 && <Pagination page={page} totalPages={totalPages} basePath="/novinky" />}
        </>
      )}
    </div>
  );
}
