import { NextResponse } from 'next/server';
import { parseSmartQuery } from '@/lib/movieSmartQuery';

export const dynamic = 'force-dynamic';

// Chytré hľadanie vetou: „komedie z 90. let s Jimem Carreym nad 70 %“ → filter.
export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get('q') || '').slice(0, 200);
  try {
    return NextResponse.json(await parseSmartQuery(q), { headers: { 'Cache-Control': 'public, s-maxage=300' } });
  } catch (error) {
    console.error('[api/movie-filter/parse]', error);
    return NextResponse.json({ patch: {}, chips: [], rest: q, understood: false });
  }
}
