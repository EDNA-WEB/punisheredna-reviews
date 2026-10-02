import { NextResponse } from 'next/server';
import { filterViewer } from '@/lib/movieFilterAuth';
import { getFilterOptions } from '@/lib/movieFilter';

export const dynamic = 'force-dynamic';

// Voľby do filtra: všetky žánre, krajiny, typy a streamovacie služby, ktoré
// sú naozaj v katalógu (aj s počtami), rozsah rokov a dĺžok.
// Len pre prihlásených — preto „private“ (CDN to nesmie podať neprihlásenému).
export async function GET(req: Request) {
  const viewer = await filterViewer(req);
  if (!viewer.userId) return NextResponse.json({ error: 'Musíš být přihlášen.' }, { status: 401 });
  try {
    return NextResponse.json(await getFilterOptions(), { headers: { 'Cache-Control': 'private, max-age=300' } });
  } catch (error) {
    console.error('[api/movie-filter/options]', error);
    return NextResponse.json({ error: 'Chyba.' }, { status: 500 });
  }
}
