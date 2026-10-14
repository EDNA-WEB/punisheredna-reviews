import Link from 'next/link';
import Pagination from '@/components/Pagination';
import { prisma } from '@/lib/prisma';
import { publishedNewsFilterForMember } from '@/lib/publishedFilter';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isActiveMember } from '@/lib/membership';
import { getDictionary, getUserLanguage } from '@/lib/i18n';
import { readingTime } from '@/lib/markdown';
import { sharpImage } from '@/lib/imageQuality';
import NewsMeta from '@/components/news/NewsMeta';

export const dynamic = 'force-dynamic';

// Rubrika Novinky: najnovší článok veľký hore, ostatné v mriežke po troch.
// Prvá strana = 1 hlavný + 9 v mriežke, ďalšie strany po 9.
const FIRST_PAGE = 10;
const PAGE_SIZE = 9;

const img = (url: string | null, w: number) => (url ? sharpImage(url, w) || url : null);

export default async function AllNewsPage(props: { searchParams: Promise<{ page?: string }> }) {
  const { searchParams } = { ...props, searchParams: await props.searchParams };
  const dict = await getDictionary(await getUserLanguage());
  const t = (k: string, f: string) => dict[k] || f;

  const session = await getServerSession(authOptions);
  const isAdmin = (session?.user as any)?.role === 'ADMIN';
  const isMember = isAdmin || (await isActiveMember((session?.user as any)?.id));
  const filter = publishedNewsFilterForMember(isMember);

  const total = await prisma.newsPost.count({ where: filter });
  const totalPages = Math.max(1, 1 + Math.ceil(Math.max(0, total - FIRST_PAGE) / PAGE_SIZE));
  const page = Math.min(totalPages, Math.max(1, Number(searchParams?.page) || 1));
  const skip = page === 1 ? 0 : FIRST_PAGE + (page - 2) * PAGE_SIZE;
  const take = page === 1 ? FIRST_PAGE : PAGE_SIZE;

  const rows = await prisma.newsPost.findMany({
    where: filter,
    orderBy: { createdAt: 'desc' },
    skip,
    take,
    select: { id: true, slug: true, title: true, summary: true, body: true, coverImage: true, createdAt: true, _count: { select: { comments: true } } }
  });
  const news = rows.map((n) => ({
    id: n.id,
    slug: n.slug,
    title: n.title,
    summary: n.summary,
    coverImage: n.coverImage,
    createdAt: n.createdAt.toISOString(),
    minutes: readingTime(n.body),
    comments: n._count.comments
  }));
  const lead = page === 1 ? news[0] : null;
  const grid = page === 1 ? news.slice(1) : news;

  return (
    <div className="pt-6 sm:pt-8 pb-4">
      <h1 className="font-display font-extrabold text-[32px] sm:text-[40px] leading-none tracking-[-0.03em] text-ink mb-6 sm:mb-7">{dict['home.novinky'] || 'Novinky'}</h1>

      {news.length === 0 ? (
        <div className="ap-card p-12 text-center text-muted">{t('news2.ziadne', 'Zatím žádné novinky.')}</div>
      ) : (
        <>
          {lead && (
            <Link href={`/news/${lead.slug}`} className="group grid md:grid-cols-[1.35fr_1fr] overflow-hidden bg-[#0D0E11] text-white mb-7 sm:mb-8 shadow-[0_20px_44px_-24px_rgba(0,0,0,.5)] -mx-5 sm:mx-0 rounded-none sm:rounded-[20px]">
              <div className="relative aspect-[16/9] md:aspect-auto md:min-h-[380px] overflow-hidden bg-[#1A1C21]">
                {lead.coverImage && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={img(lead.coverImage, 900)!} alt="" className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                )}
                <span className="absolute left-4 top-4 bg-accent text-white text-[11px] font-extrabold tracking-[.05em] uppercase rounded-full px-2.5 py-1">{dict['news.novinka_odznak'] || 'Novinka'}</span>
              </div>
              <div className="p-6 sm:p-8 flex flex-col justify-center min-w-0">
                <h2 className="font-display font-extrabold text-[22px] sm:text-[29px] leading-[1.2] tracking-[-0.02em] group-hover:underline decoration-2 underline-offset-4">{lead.title}</h2>
                {lead.summary && <p className="text-[15px] leading-relaxed text-white/75 mt-3.5 line-clamp-4">{lead.summary}</p>}
                <div className="mt-5">
                  <NewsMeta createdAt={lead.createdAt} minutes={lead.minutes} comments={lead.comments} dark />
                </div>
              </div>
            </Link>
          )}

          {grid.length > 0 && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 mb-8">
              {grid.map((n) => (
                <Link key={n.id} href={`/news/${n.slug}`} className="ap-card overflow-hidden group flex flex-col">
                  <div className="relative aspect-[16/9] bg-surface overflow-hidden">
                    {n.coverImage && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={img(n.coverImage, 480)!} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.04]" />
                    )}
                  </div>
                  <div className="p-4 flex-1 flex flex-col">
                    <h3 className="font-display font-bold text-[16.5px] leading-[1.3] tracking-[-0.01em] text-ink group-hover:text-accent transition-colors line-clamp-3">{n.title}</h3>
                    <div className="mt-auto pt-2.5">
                      <NewsMeta createdAt={n.createdAt} minutes={n.minutes} comments={n.comments} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {totalPages > 1 && <Pagination page={page} totalPages={totalPages} basePath="/novinky" />}
        </>
      )}
    </div>
  );
}
