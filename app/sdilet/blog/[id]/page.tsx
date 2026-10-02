import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { excerpt, mdToHtml, readingTime } from '@/lib/markdown';
import { trackArticleView } from '@/lib/trackView';
import { getShareConfig, neutralizeLinks, proxiedImage, recordShareView, rewriteImages, verifyShareKey } from '@/lib/articleShare';
import SharedArticle from '@/components/SharedArticle';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ k?: string }> };

const NOINDEX: Metadata = { robots: { index: false, follow: false } };

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { id } = await props.params;
  const { k } = await props.searchParams;
  if (!(await getShareConfig()).enabled || !(await verifyShareKey('blog', id, k))) return NOINDEX;
  const post = await prisma.blogPost.findUnique({ where: { id }, select: { title: true, body: true, coverImage: true } });
  if (!post) return NOINDEX;
  const description = excerpt(post.body, 160);
  const img = proxiedImage(post.coverImage);
  return { ...NOINDEX, title: post.title, description, openGraph: { title: post.title, description, images: img ? [{ url: img }] : undefined, type: 'article' } };
}

// Zdieľaný BLOGOVÝ článok — len článok, nič iné. Bez platného kľúča → prihlásenie.
export default async function SharedBlogPage(props: Props) {
  const { id } = await props.params;
  const { k } = await props.searchParams;

  const session = await getServerSession(authOptions);
  if (session) redirect(`/blog/${encodeURIComponent(id)}`);

  const cfg = await getShareConfig();
  if (!cfg.enabled || !(await verifyShareKey('blog', id, k))) redirect('/login');

  const post = await prisma.blogPost.findUnique({
    where: { id },
    select: { id: true, title: true, body: true, coverImage: true, createdAt: true, isDraft: true, published: true, author: { select: { name: true } } }
  });
  if (!post || post.isDraft || !post.published) redirect('/login');

  await recordShareView('blog', post.id);
  try {
    await trackArticleView('blog', post.id);
  } catch {
    /* počítadlo nie je dôležité */
  }

  return (
    <SharedArticle
      kicker="Článek"
      title={post.title}
      summary={null}
      author={post.author.name}
      date={post.createdAt.toISOString()}
      minutes={readingTime(post.body)}
      cover={proxiedImage(post.coverImage)}
      html={rewriteImages(neutralizeLinks(mdToHtml(post.body)))}
    />
  );
}
