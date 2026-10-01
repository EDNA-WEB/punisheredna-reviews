import { prisma } from '@/lib/prisma';
import { cloudinaryVoiceSource, isVoiceAvailable, scheduleVoiceCleanup, verifyVoiceToken } from '@/lib/voiceMessages';

export const dynamic = 'force-dynamic';

const NO_STORE = 'private, no-store, max-age=0';

// Samotný zvuk hlasovky. Odkaz má krátkodobý podpis (?t=…) a pri KAŽDEJ
// požiadavke sa znova overí čas v DB — po audioExpiresAt už nevydá nič, ani
// so starým odkazom. Zvuk sa preposiela z Cloudinary cez náš server, takže
// skutočná adresa súboru sa k nikomu nedostane. Podporuje Range (posúvanie
// a prehrávanie na iPhone).
async function handle(req: Request, ctx: { params: Promise<{ id: string }> }, withBody: boolean) {
  const { id } = await ctx.params;
  const token = new URL(req.url).searchParams.get('t');
  if (!verifyVoiceToken(id, token)) return new Response('Neplatný odkaz.', { status: 403, headers: { 'Cache-Control': NO_STORE } });

  const m = await prisma.message.findUnique({
    where: { id },
    select: { audioPublicId: true, audioFormat: true, audioExpiresAt: true }
  });
  if (!m || !isVoiceAvailable(m)) {
    scheduleVoiceCleanup(true);
    return new Response('Hlasová zpráva vypršela.', { status: 410, headers: { 'Cache-Control': NO_STORE } });
  }

  const range = req.headers.get('range');
  const upstream = await fetch(cloudinaryVoiceSource(m.audioPublicId as string, m.audioFormat), {
    method: withBody ? 'GET' : 'HEAD',
    headers: range ? { Range: range } : {},
    cache: 'no-store'
  });
  if (!upstream.ok && upstream.status !== 206) {
    return new Response('Zvuk se nepodařilo načíst.', { status: 502, headers: { 'Cache-Control': NO_STORE } });
  }

  const headers = new Headers({ 'Cache-Control': NO_STORE, 'X-Content-Type-Options': 'nosniff', 'Accept-Ranges': 'bytes' });
  for (const h of ['content-length', 'content-range']) {
    const v = upstream.headers.get(h);
    if (v) headers.set(h, v);
  }
  const fmt = (m.audioFormat || '').toLowerCase();
  headers.set(
    'Content-Type',
    ['m4a', 'mp4', 'aac', 'mov'].includes(fmt) ? 'audio/mp4' : fmt === 'mp3' ? 'audio/mpeg' : upstream.headers.get('content-type') || 'audio/mp4'
  );

  return new Response(withBody ? upstream.body : null, { status: upstream.status, headers });
}

export function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return handle(req, ctx, true);
}

export function HEAD(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return handle(req, ctx, false);
}
