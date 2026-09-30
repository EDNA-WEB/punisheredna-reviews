import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { revalidateTag } from 'next/cache';
import { debugWeekendBoxOffice } from '@/lib/weekendBoxOffice';

export const dynamic = 'force-dynamic';

// Len pre admina: ukáže, čo presne prišlo z GitHubu a koľko filmov sa spárovalo.
// Otvor v prehliadači: /api/admin/box-office-debug
// S ?obnovit=1 navyše zahodí 10-hodinovú cache, takže web aj appka hneď načítajú čerstvé dáta.
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Nemáš oprávnenie.' }, { status: 403 });
  }
  try {
    const refresh = new URL(req.url).searchParams.get('obnovit') === '1';
    if (refresh) revalidateTag('weekend-box-office', 'max');
    return NextResponse.json({ cacheCleared: refresh, ...(await debugWeekendBoxOffice()) });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
