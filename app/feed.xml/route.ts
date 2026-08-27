import { prisma } from '@/lib/prisma';
import { publishedNewsFilter } from '@/lib/publishedFilter';
import { excerpt } from '@/lib/markdown';

const siteUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

function escapeXml(s: string) {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export async function GET() {
  const news = await prisma.newsPost.findMany({
    where: publishedNewsFilter(),
    orderBy: { createdAt: 'desc' },
    take: 30,
    include: { author: { select: { name: true } } }
  });

  const items = news
    .map(
      (n) => `
    <item>
      <title>${escapeXml(n.title)}</title>
      <link>${siteUrl}/news/${n.slug}</link>
      <guid>${siteUrl}/news/${n.slug}</guid>
      <pubDate>${n.createdAt.toUTCString()}</pubDate>
      <author>${escapeXml(n.author.name)}</author>
      <description>${escapeXml(n.summary || excerpt(n.body, 200))}</description>
    </item>`
    )
    .join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>PunisherEDNA reviews — Novinky</title>
    <link>${siteUrl}/novinky</link>
    <description>Najnovšie filmové novinky z PunisherEDNA reviews.</description>
    <language>sk</language>${items}
  </channel>
</rss>`;

  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
}
