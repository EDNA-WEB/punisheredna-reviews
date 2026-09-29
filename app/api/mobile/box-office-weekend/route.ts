import { NextResponse } from 'next/server';
import { getWeekendBoxOffice } from '@/lib/weekendBoxOffice';

export const dynamic = 'force-dynamic';

// Víkendový Top box office (USA) pre appku — presne tie isté dáta ako box na
// hlavnej stránke webu. Sú cachované 10 h (lib/weekendBoxOffice.ts), takže
// appka tým nezaťažuje databázu ani GitHub.
export async function GET() {
  try {
    const data = await getWeekendBoxOffice();
    return NextResponse.json(data || { entries: [] }, { status: 200 });
  } catch (error) {
    console.error('[api/mobile/box-office-weekend]', error);
    return NextResponse.json({ entries: [] }, { status: 200 });
  }
}
