import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getMobileUser } from '@/lib/mobileAuth';

export const dynamic = 'force-dynamic';

// Zoznam VŠETKÝCH fanúšikov (followerov) daného používateľa, s príznakom,
// či ich prihlásený používateľ sám tiež sleduje (na zobrazenie
// srdiečka "Sledovat"/"Odebrat").
export async function GET(req: Request) {
  try {
    const me = await getMobileUser(req);
    if (!me) return NextResponse.json({ error: 'Neplatné nebo vypršelé přihlášení.' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    if (!userId) return NextResponse.json({ error: 'Chýba userId.' }, { status: 400 });

    const [target, follows] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true } }),
      prisma.follow.findMany({
        where: { followingId: userId },
        orderBy: { createdAt: 'desc' },
        select: { follower: { select: { id: true, name: true, avatar: true } } }
      })
    ]);
    if (!target) return NextResponse.json({ error: 'Uživatel se nenašel.' }, { status: 404 });

    const followerIds = follows.map((f) => f.follower.id);
    const myFollowing = await prisma.follow.findMany({
      where: { followerId: me.id, followingId: { in: followerIds } },
      select: { followingId: true }
    });
    const myFollowingSet = new Set(myFollowing.map((f) => f.followingId));

    const followers = follows.map((f) => ({ ...f.follower, isFollowedByMe: myFollowingSet.has(f.follower.id) }));

    return NextResponse.json({ targetName: target.name, followers }, { status: 200 });
  } catch (error) {
    console.error('[api/mobile/followers]', error);
    return NextResponse.json({ error: 'Chyba při načítání.' }, { status: 500 });
  }
}
