import { MetadataRoute } from 'next';

const siteUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

// Zámerne BEZ zoznamu "zakázaných" ciest (napr. /admin, /api) — robots.txt je
// verejný a útočníci ho čítajú ako mapu citlivých miest. Neverejné časti sú
// chránené prihlásením a administrácia pre cudzích vracia 404 + hlavičku
// X-Robots-Tag: noindex (middleware.ts), takže ich tu uvádzať netreba.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: `${siteUrl}/sitemap.xml`
  };
}
