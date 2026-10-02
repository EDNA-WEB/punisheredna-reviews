import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { excerpt, mdToHtml, readingTime } from '@/lib/markdown';
import { trackArticleView } from '@/lib/trackView';
import { isArticleShareEnabled, neutralizeLinks } from '@/lib/articleShare';
import SharedArticle from '@/components/SharedArticle';

export const dynamic = 'force-dynamic';

export async function generateMetadata(props: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await props.params;
  const post = await prisma.blogPost.findUnique({ where: { id }, select: { title: true, body: true, coverImage: true } });
  if (!post) return { robots: { index: false, follow: false } };
  const description = excerpt(post.body, 160);
  return {
    title: post.title,
    description,
    robots: { index: false, follow: false },
    openGraph: { title: post.title, description, images: post.coverImage ? [{ url: post.coverImage }] : undefined, type: 'article' }
  };
}

// Zdieľaný BLOGOVÝ článok — len článok, nič iné.
export default async function SharedBlogPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;

  const session = await getServerSession(authOptions);
  if (session) redirect(`/blog/${encodeURIComponent(id)}`);
  if (!(await isArticleShareEnabled())) redirect('/login');

  const post = await prisma.blogPost.findUnique({
    where: { id },
    select: { id: true, title: true, body: true, coverImage: true, createdAt: true, isDraft: true, published: true, author: { select: { name: true } } }
  });
  // Zdieľať sa dá len zverejnený článok (nie koncept ani neschválený)
  if (!post || post.isDraft || !post.published) return notFound();

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
      cover={post.coverImage}
      html={neutralizeLinks(mdToHtml(post.body))}
    />
  );
}
