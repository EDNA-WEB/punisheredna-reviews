import { NextResponse } from 'next/server';
import { cdnHeaders } from '@/lib/memoCache';
import { getFilterOptions } from '@/lib/movieFilter';

export const dynamic = 'force-dynamic';

// Voľby do filtra: všetky žánre, krajiny, typy a streamovacie služby, ktoré
// sú naozaj v katalógu (aj s počtami), rozsah rokov a dĺžok.
export async function GET() {
  try {
    return NextResponse.json(await getFilterOptions(), { headers: cdnHeaders(300) });
  } catch (error) {
    console.error('[api/movie-filter/options]', error);
    return NextResponse.json({ error: 'Chyba.' }, { status: 500 });
  }
}
