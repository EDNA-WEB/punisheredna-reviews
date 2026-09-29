import { NextResponse } from 'next/server';
import { cdnHeaders } from '@/lib/memoCache';
import { getBirthdaysToday } from '@/lib/peopleToday';

export const dynamic = 'force-dynamic';

// Kto má dnes narodeniny — rovnaké dáta ako na hlavnej stránke webu.
export async function GET() {
  try {
    const people = await getBirthdaysToday(8);
    return NextResponse.json({ people }, { status: 200, headers: cdnHeaders(1800) });
  } catch (error) {
    console.error('[api/mobile/birthdays-today]', error);
    return NextResponse.json({ people: [] }, { status: 200 });
  }
}
