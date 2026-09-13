// Pomocné funkcie na zostavenie schema.org štruktúrovaných dát (JSON-LD).
// Vďaka nim vie Google zobraziť vo výsledkoch vyhľadávania bohatší náhľad
// (hviezdičky hodnotenia, dátum článku, meno autora a pod.), nielen holý odkaz.

const siteUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

export function movieJsonLd(movie: {
  title: string;
  slug: string;
  synopsis: string | null;
  poster: string | null;
  year: string | null;
  contentType: string;
  director: string | null;
  cast: string | null;
  percent: number | null;
  ratingCount: number;
}) {
  const type = movie.contentType === 'Seriál' ? 'TVSeries' : 'Movie';
  const data: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': type,
    name: movie.title,
    url: `${siteUrl}/movie/${movie.slug}`,
    description: movie.synopsis || undefined,
    image: movie.poster || undefined,
    datePublished: movie.year || undefined,
    director: movie.director
      ? movie.director.split(',').map((n) => ({ '@type': 'Person', name: n.trim() }))
      : undefined,
    actor: movie.cast
      ? movie.cast.split(',').map((n) => ({ '@type': 'Person', name: n.trim() }))
      : undefined
  };
  if (movie.percent !== null && movie.ratingCount > 0) {
    data.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: (movie.percent / 20).toFixed(1),
      bestRating: 5,
      worstRating: 0.5,
      ratingCount: movie.ratingCount
    };
  }
  return JSON.stringify(data);
}

export function articleJsonLd(article: {
  title: string;
  description: string;
  image: string | null;
  url: string;
  authorName: string;
  publishedAt: Date;
  tags?: string[];
}) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: article.title,
    description: article.description,
    image: article.image || undefined,
    url: article.url,
    datePublished: article.publishedAt.toISOString(),
    author: { '@type': 'Person', name: article.authorName },
    publisher: {
      '@type': 'Organization',
      name: 'PunisherEDNA reviews',
      logo: { '@type': 'ImageObject', url: `${siteUrl}/logo.svg` }
    },
    keywords: article.tags && article.tags.length > 0 ? article.tags.join(', ') : undefined
  };
  return JSON.stringify(data);
}

export function personJsonLd(person: { name: string; slug: string; bio: string | null; photo: string | null; role: string | null }) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: person.name,
    url: `${siteUrl}/osobnost/${person.slug}`,
    description: person.bio || undefined,
    image: person.photo || undefined,
    jobTitle: person.role || undefined
  };
  return JSON.stringify(data);
}

export function breadcrumbJsonLd(items: { name: string; url: string }[]) {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url
    }))
  });
}
