import { NextResponse } from 'next/server';
import { getMobileUser } from '@/lib/mobileAuth';

// Appka toto volá pri každom spustení, aby zistila, či je uložený token ešte
// platný (a rovno dostala čerstvé údaje o používateľovi — meno sa mohlo
// medzičasom zmeniť a pod.), bez nutnosti opäť zadávať heslo.
export async function GET(req: Request) {
  const user = await getMobileUser(req);
  if (!user) return NextResponse.json({ error: 'Neplatné alebo vypršané prihlásenie.' }, { status: 401 });

  return NextResponse.json({
    user: { id: user.id, name: user.name, role: user.role, avatar: user.avatar, membershipUntil: user.membershipUntil }
  });
}
