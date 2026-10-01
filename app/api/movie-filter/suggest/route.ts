import { NextResponse } from 'next/server';
import { cdnHeaders } from '@/lib/memoCache';
import { suggest, type SuggestKind } from '@/lib/movieFilter';

export const dynamic = 'force-dynamic';

const KINDS: SuggestKind[] = ['director', 'actor', 'writer', 'camera', 'music', 'keyword', 'title'];

// Našepkávanie mien (režisér, herec…) a kľúčových slov z celého katalógu.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const kind = searchParams.get('kind') as SuggestKind;
  const q = (searchParams.get('q') || '').slice(0, 60);
  if (!KINDS.includes(kind)) return NextResponse.json([], { status: 400 });
  try {
    return NextResponse.json(await suggest(kind, q), { headers: cdnHeaders(300) });
  } catch (error) {
    console.error('[api/movie-filter/suggest]', error);
    return NextResponse.json([], { status: 500 });
  }
}
