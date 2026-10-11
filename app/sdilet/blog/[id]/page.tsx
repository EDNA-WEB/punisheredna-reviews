import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { excerpt, mdToHtml, readingTime } from '@/lib/markdown';
import { trackArticleView } from '@/lib/trackView';
import { getShareConfig, neutralizeLinks, proxiedImage, rewriteImages, stillVideos, strictProxiedImage, verifyShareKey } from '@/lib/articleShare';
import { normalizeTag, trackShareVisit } from '@/lib/visitorAnalytics';
import { getDictionary, getUserLanguage } from '@/lib/i18n';
import { loadAuthorStats, loadMostRead, loadRelated, plainImg, type ImgFn } from '@/lib/articleData';
import ArticleView from '@/components/article/ArticleView';
import SharedPrivacyNote from '@/components/article/SharedPrivacyNote';

// Obrázky zdieľanej verzie idú cez našu adresu (/sdilet/img/…), nie priamo z Cloudinary/TMDb.
const shareImg: ImgFn = (url, w) => strictProxiedImage(plainImg(url, w));

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ k?: string; s?: string }> };

const NOINDEX: Metadata = { robots: { index: false, follow: false } };

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { id } = await props.params;
  const { k, s: rawTag } = await props.searchParams;
  const tag = normalizeTag(rawTag);
  if (!(await getShareConfig()).enabled || !(await verifyShareKey('blog', id, k, tag))) return NOINDEX;
  const post = await prisma.blogPost.findUnique({ where: { id }, select: { title: true, body: true, coverImage: true } });
  if (!post) return NOINDEX;
  const description = excerpt(post.body, 160);
  const img = proxiedImage(post.coverImage);
  return { ...NOINDEX, title: post.title, description, openGraph: { title: post.title, description, images: img ? [{ url: img }] : undefined, type: 'article' } };
}

// Zdieľaný BLOGOVÝ článok — len článok, nič iné. Bez platného kľúča → prihlásenie.
export default async function SharedBlogPage(props: Props) {
  const { id } = await props.params;
  const { k, s: rawTag } = await props.searchParams;
  const tag = normalizeTag(rawTag);

  const session = await getServerSession(authOptions);
  if (session) redirect(`/blog/${encodeURIComponent(id)}`);

  const cfg = await getShareConfig();
  if (!cfg.enabled || !(await verifyShareKey('blog', id, k, tag))) redirect('/login');

  const post = await prisma.blogPost.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      body: true,
      tags: true,
      coverImage: true,
      createdAt: true,
      isDraft: true,
      published: true,
      author: { select: { id: true, name: true, avatar: true, role: true, bio: true } }
    }
  });
  if (!post || post.isDraft || !post.published) redirect('/login');

  await trackShareVisit('blog', post.id, tag); // anonymná analytika (lib/visitorAnalytics.ts)
  try {
    await trackArticleView('blog', post.id);
  } catch {
    /* počítadlo nie je dôležité */
  }

  const dict = await getDictionary(await getUserLanguage());
  const t = (k: string, f: string) => dict[k] || f;
  const kicker = t('clanok.clanek', 'Článek');

  const [mostRead, related, authorStats] = await Promise.all([
    loadMostRead('blog', post.id, shareImg, kicker),
    loadRelated('blog', post.id, post.tags, shareImg, kicker),
    loadAuthorStats(post.author.id, { reviews: t('clanok.recenze', 'Recenze'), articles: t('clanok.clanky', 'Články') })
  ]);

  const html = rewriteImages(stillVideos(neutralizeLinks(mdToHtml(post.body))));

  return (
    <ArticleView
      readOnly
      kicker={kicker}
      breadcrumb={[{ label: t('clanok.domu', 'Domů'), href: null }, { label: t('clanok.blog', 'Blog'), href: null }]}
      chips={[]}
      title={post.title}
      perex={null}
      minutes={readingTime(post.body)}
      date={post.createdAt.toISOString()}
      author={{
        name: post.author.name,
        avatar: shareImg(post.author.avatar, 64),
        href: null,
        isCritic: post.author.role === 'ADMIN',
        stats: authorStats,
        bio: post.author.bio || null,
        follow: null
      }}
      cover={shareImg(post.coverImage, 900)}
      trailerYoutubeId={null}
      html={html}
      movie={null}
      tags={post.tags.map((tag) => ({ label: tag, href: null }))}
      likes={null}
      canReact={false}
      likeTarget={null}
      commentCount={null}
      mostRead={mostRead}
      mostReadTitle={t('clanok.nejctenejsi', 'Nejčtenější')}
      related={related}
      sharePath={null}
      footer={<SharedPrivacyNote />}
    />
  );
}
