import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { mdToHtml, readingTime } from '@/lib/markdown';
import { trackArticleView } from '@/lib/trackView';
import { getShareConfig, neutralizeLinks, proxiedImage, rewriteImages, stillVideos, strictProxiedImage, verifyShareKey } from '@/lib/articleShare';
import { normalizeTag, trackShareVisit } from '@/lib/visitorAnalytics';
import { getDictionary, getUserLanguage } from '@/lib/i18n';
import { loadArticleMovie, loadAuthorStats, loadMostRead, loadReadOnlyComments, loadRelated, plainImg, type ImgFn } from '@/lib/articleData';
import ArticleView from '@/components/article/ArticleView';
import SharedPrivacyNote from '@/components/article/SharedPrivacyNote';

// Obrázky zdieľanej verzie idú cez našu adresu (/sdilet/img/…), nie priamo z Cloudinary/TMDb.
const shareImg: ImgFn = (url, w) => strictProxiedImage(plainImg(url, w));

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ k?: string; s?: string }> };

const NOINDEX: Metadata = { robots: { index: false, follow: false } };

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { slug } = await props.params;
  const { k, s: rawTag } = await props.searchParams;
  const tag = normalizeTag(rawTag);
  // Názov a obrázok len pri platnom odkaze (inak nič neprezradíme)
  if (!(await getShareConfig()).enabled || !(await verifyShareKey('news', slug, k, tag))) return NOINDEX;
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
  const { k, s: rawTag } = await props.searchParams;
  const tag = normalizeTag(rawTag);

  const session = await getServerSession(authOptions);
  if (session) redirect(`/news/${encodeURIComponent(slug)}`);

  const cfg = await getShareConfig();
  if (!cfg.enabled || !(await verifyShareKey('news', slug, k, tag))) redirect('/login');

  const news = await prisma.newsPost.findUnique({
    where: { slug },
    select: {
      id: true,
      title: true,
      body: true,
      tags: true,
      coverImage: true,
      createdAt: true,
      publishAt: true,
      isDraft: true,
      movieId: true,
      author: { select: { id: true, name: true, avatar: true, role: true, bio: true } },
      likes: { select: { value: true } }
    }
  });
  if (!news || news.isDraft || (news.publishAt && news.publishAt > new Date())) redirect('/login');

  // Zdieľaná novinka je viditeľná OKAMŽITE po zverejnení (bez 10 h lehoty pre nečlenov).

  await trackShareVisit('news', news.id, tag); // anonymná analytika (lib/visitorAnalytics.ts)
  try {
    await trackArticleView('news', news.id);
  } catch {
    /* počítadlo nie je dôležité */
  }

  const dict = await getDictionary(await getUserLanguage());
  const t = (k: string, f: string) => dict[k] || f;
  const kicker = t('clanok.novinka', 'Novinka');

  const [{ movie, movieTitle }, mostRead, related, authorStats, ro] = await Promise.all([
    loadArticleMovie(news.movieId, {
      readOnly: true,
      img: shareImg,
      labels: {
        premiere: t('clanok.premiera', 'Premiéra'),
        director: t('clanok.rezie', 'Režie'),
        runtime: t('clanok.delka', 'Délka'),
        country: t('clanok.zeme', 'Země'),
        type: t('clanok.typ', 'Typ')
      }
    }),
    loadMostRead('news', news.id, shareImg, kicker),
    loadRelated('news', news.id, news.tags, shareImg, kicker),
    loadAuthorStats(news.author.id, { reviews: t('clanok.recenze', 'Recenze'), articles: t('clanok.clanky', 'Články') }),
    loadReadOnlyComments(news.id, news.author.id, shareImg, t('user.zmazany_pouzivatel', 'Smazaný uživatel'))
  ]);

  // Celý vzhľad ako pre prihlásených, ale len na čítanie: odkazy v texte sú
  // obyčajný text, videá len náhľad, obrázky cez našu adresu.
  const html = rewriteImages(stillVideos(neutralizeLinks(mdToHtml(news.body))));

  return (
    <ArticleView
      readOnly
      kicker={kicker}
      breadcrumb={[{ label: t('clanok.domu', 'Domů'), href: null }, { label: t('nav.novinky', 'Novinky'), href: null }, ...(news.tags[0] ? [{ label: news.tags[0], href: null }] : [])]}
      chips={movieTitle ? [movieTitle] : []}
      title={news.title}
      perex={null}
      minutes={readingTime(news.body)}
      date={(news.publishAt || news.createdAt).toISOString()}
      author={{
        name: news.author.name,
        avatar: shareImg(news.author.avatar, 64),
        href: null,
        isCritic: news.author.role === 'ADMIN',
        stats: authorStats,
        bio: news.author.bio || null,
        follow: null
      }}
      cover={shareImg(news.coverImage, 900)}
      trailerYoutubeId={null}
      html={html}
      movie={movie}
      tags={news.tags.map((tag) => ({ label: tag, href: null }))}
      likes={{ myValue: 0, likeCount: news.likes.filter((l) => l.value === 1).length, dislikeCount: news.likes.filter((l) => l.value === -1).length }}
      canReact={false}
      likeTarget={null}
      commentCount={ro.total}
      readOnlyComments={ro.comments}
      mostRead={mostRead}
      mostReadTitle={t('clanok.nejctenejsi', 'Nejčtenější')}
      related={related}
      sharePath={null}
      footer={<SharedPrivacyNote />}
    />
  );
}
