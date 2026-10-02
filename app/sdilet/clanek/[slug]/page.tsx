import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { mdToHtml, readingTime } from '@/lib/markdown';
import { trackArticleView } from '@/lib/trackView';
import { isArticleShareEnabled, neutralizeLinks } from '@/lib/articleShare';
import SharedArticle from '@/components/SharedArticle';

export const dynamic = 'force-dynamic';

export async function generateMetadata(props: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await props.params;
  const news = await prisma.newsPost.findUnique({ where: { slug }, select: { title: true, summary: true, coverImage: true } });
  if (!news) return { robots: { index: false, follow: false } };
  return {
    title: news.title,
    description: news.summary,
    robots: { index: false, follow: false },
    openGraph: { title: news.title, description: news.summary, images: news.coverImage ? [{ url: news.coverImage }] : undefined, type: 'article' }
  };
}

// Zdieľaná NOVINKA — len článok, nič iné.
export default async function SharedNewsPage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;

  // Prihlásený používateľ → bežná stránka článku so všetkým
  const session = await getServerSession(authOptions);
  if (session) redirect(`/news/${encodeURIComponent(slug)}`);

  // Zdieľanie vypnuté → ako každá iná stránka webu pre neprihláseného
  if (!(await isArticleShareEnabled())) redirect('/login');

  const news = await prisma.newsPost.findUnique({
    where: { slug },
    select: { id: true, title: true, summary: true, body: true, coverImage: true, createdAt: true, publishAt: true, isDraft: true, author: { select: { name: true } } }
  });
  if (!news || news.isDraft || (news.publishAt && news.publishAt > new Date())) return notFound();

  try {
    await trackArticleView('news', news.id);
  } catch {
    /* počítadlo nie je dôležité */
  }

  return (
    <SharedArticle
      kicker="Novinka"
      title={news.title}
      summary={null} // anotácia patrí len do náhľadu článku (zoznamy, sociálne siete), nie do samotného článku
      author={news.author.name}
      date={(news.publishAt || news.createdAt).toISOString()}
      minutes={readingTime(news.body)}
      cover={news.coverImage}
      html={neutralizeLinks(mdToHtml(news.body))}
    />
  );
}
