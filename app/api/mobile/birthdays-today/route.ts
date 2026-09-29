import { NextResponse } from 'next/server';
import { getBirthdaysToday } from '@/lib/peopleToday';

export const dynamic = 'force-dynamic';

// Kto má dnes narodeniny — rovnaké dáta ako na hlavnej stránke webu.
export async function GET() {
  try {
    const people = await getBirthdaysToday(8);
    return NextResponse.json({ people }, { status: 200 });
  } catch (error) {
    console.error('[api/mobile/birthdays-today]', error);
    return NextResponse.json({ people: [] }, { status: 200 });
  }
}
