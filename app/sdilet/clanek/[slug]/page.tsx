import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { mdToHtml, readingTime } from '@/lib/markdown';
import { trackArticleView } from '@/lib/trackView';
import { getShareConfig, neutralizeLinks, proxiedImage, recordShareView, rewriteImages, verifyShareKey } from '@/lib/articleShare';
import SharedArticle from '@/components/SharedArticle';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ k?: string }> };

const NOINDEX: Metadata = { robots: { index: false, follow: false } };

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { slug } = await props.params;
  const { k } = await props.searchParams;
  // Názov a obrázok len pri platnom odkaze (inak nič neprezradíme)
  if (!(await getShareConfig()).enabled || !(await verifyShareKey('news', slug, k))) return NOINDEX;
  const news = await prisma.newsPost.findUnique({ where: { slug }, select: { title: true, summary: true, coverImage: true } });
  if (!news) return NOINDEX;
  const img = proxiedImage(news.coverImage);
  return {
    ...NOINDEX,
    title: news.title,
    description: news.summary,
    openGraph: { title: news.title, description: news.summary, images: img ? [{ url: img }] : undefined, type: 'article' }
  };
}

// Zdieľaná NOVINKA — len článok, nič iné. Bez platného kľúča → prihlásenie.
export default async function SharedNewsPage(props: Props) {
  const { slug } = await props.params;
  const { k } = await props.searchParams;

  const session = await getServerSession(authOptions);
  if (session) redirect(`/news/${encodeURIComponent(slug)}`);

  const cfg = await getShareConfig();
  if (!cfg.enabled || !(await verifyShareKey('news', slug, k))) redirect('/login');

  const news = await prisma.newsPost.findUnique({
    where: { slug },
    select: { id: true, title: true, body: true, coverImage: true, createdAt: true, publishAt: true, isDraft: true, author: { select: { name: true } } }
  });
  if (!news || news.isDraft || (news.publishAt && news.publishAt > new Date())) redirect('/login');

  // Zdieľaná novinka je viditeľná OKAMŽITE po zverejnení (bez 10 h lehoty pre nečlenov).

  await recordShareView('news', news.id);
  try {
    await trackArticleView('news', news.id);
  } catch {
    /* počítadlo nie je dôležité */
  }

  return (
    <SharedArticle
      kicker="Novinka"
      title={news.title}
      summary={null}
      author={news.author.name}
      date={(news.publishAt || news.createdAt).toISOString()}
      minutes={readingTime(news.body)}
      cover={proxiedImage(news.coverImage)}
      html={rewriteImages(neutralizeLinks(mdToHtml(news.body)))}
    />
  );
}
