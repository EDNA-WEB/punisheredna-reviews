import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getShareConfig, shareKey } from '@/lib/articleShare';
import { normalizeTag } from '@/lib/visitorAnalytics';

export const dynamic = 'force-dynamic';

// Vytvorí zdieľací odkaz s UMIESTNENÍM (napr. „ČSFD – diskuse k filmu X“).
// Umiestnenie je súčasťou podpisu, takže štatistika presne ukáže, odkiaľ
// návštevy prišli — bez sledovania ľudí a bez spoliehania sa na Referer.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') return NextResponse.json({ error: 'Nemáš oprávnění.' }, { status: 403 });
  const { type, ref, label } = await req.json().catch(() => ({}));
  if ((type !== 'news' && type !== 'blog') || typeof ref !== 'string' || !ref || ref.length > 200) {
    return NextResponse.json({ error: 'Neplatný článek.' }, { status: 400 });
  }
  const tag = normalizeTag(label);
  const { salt } = await getShareConfig();
  const base = type === 'news' ? `/sdilet/clanek/${encodeURIComponent(ref)}` : `/sdilet/blog/${encodeURIComponent(ref)}`;
  const qs = new URLSearchParams({ k: shareKey(type, ref, salt, tag) });
  if (tag) qs.set('s', tag);
  return NextResponse.json({ path: `${base}?${qs.toString()}`, tag });
}
