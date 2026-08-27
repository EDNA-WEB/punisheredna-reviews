import { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';

const siteUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [movies, people, news] = await Promise.all([
    prisma.movie.findMany({ where: { approved: true }, select: { slug: true, createdAt: true }, take: 5000 }),
    prisma.person.findMany({ where: { approved: true }, select: { slug: true }, take: 2000 }),
    prisma.newsPost.findMany({ select: { slug: true, createdAt: true }, take: 2000 })
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: siteUrl, changeFrequency: 'daily', priority: 1 },
    { url: `${siteUrl}/recenzie`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${siteUrl}/novinky`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${siteUrl}/kino`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${siteUrl}/rebricky`, changeFrequency: 'weekly', priority: 0.6 }
  ];

  const movieRoutes: MetadataRoute.Sitemap = movies.map((m) => ({
    url: `${siteUrl}/movie/${m.slug}`,
    lastModified: m.createdAt,
    changeFrequency: 'weekly',
    priority: 0.9
  }));

  const personRoutes: MetadataRoute.Sitemap = people.map((p) => ({
    url: `${siteUrl}/osobnost/${p.slug}`,
    changeFrequency: 'monthly',
    priority: 0.5
  }));

  const newsRoutes: MetadataRoute.Sitemap = news.map((n) => ({
    url: `${siteUrl}/news/${n.slug}`,
    lastModified: n.createdAt,
    changeFrequency: 'monthly',
    priority: 0.5
  }));

  return [...staticRoutes, ...movieRoutes, ...personRoutes, ...newsRoutes];
}
