import { decodeImageToken, isArticleShareEnabled } from '@/lib/articleShare';

export const dynamic = 'force-dynamic';

// Obrázok zo zdieľaného článku cez našu adresu — návštevník nevidí, kde je
// obrázok naozaj uložený (Cloudinary / TMDb). Adresa je podpísaná, takže sa
// nedá zneužiť na sťahovanie čohokoľvek iného.
export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const url = decodeImageToken(token);
  if (!url || !(await isArticleShareEnabled())) return new Response('Nenalezeno.', { status: 404 });

  const upstream = await fetch(url, { cache: 'no-store' }).catch(() => null);
  if (!upstream || !upstream.ok) return new Response('Nenalezeno.', { status: 404 });

  const type = upstream.headers.get('content-type') || 'image/jpeg';
  if (!type.startsWith('image/')) return new Response('Nenalezeno.', { status: 404 });

  return new Response(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': type,
      // CDN Vercelu si obrázok podrží deň → takmer žiadna záťaž servera
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}
