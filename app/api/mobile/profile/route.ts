import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getMobileUser } from '@/lib/mobileAuth';
import { getCountryFlagUrl } from '@/lib/countryFlags';

export const dynamic = 'force-dynamic';

// Zjednodušená appková verzia webovej profilovej stránky — základné údaje,
// štatistiky, posledné recenzie a hodnotenia. (Blog príspevky a filmové
// zoznamy zatiaľ appka nezobrazuje, to je zatiaľ len na webe.)
export async function GET(req: Request) {
  try {
    const authUser = await getMobileUser(req);
    if (!authUser) return NextResponse.json({ error: 'Neplatné alebo vypršané prihlásenie.' }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: {
        id: true,
        name: true,
        avatar: true,
        bio: true,
        tagline: true,
        role: true,
        isEditor: true,
        membershipUntil: true,
        country: true,
        region: true,
        createdAt: true,
        _count: { select: { comments: true, reviews: true, followedBy: true, following: true } }
      }
    });
    if (!user) return NextResponse.json({ error: 'Uživatel se nenašel.' }, { status: 404 });

    const [reviews, ratings, followersPreview] = await Promise.all([
      prisma.review.findMany({
        where: { authorId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, body: true, createdAt: true, movie: { select: { title: true, slug: true, poster: true } } }
      }),
      prisma.rating.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, value: true, createdAt: true, movie: { select: { title: true, slug: true, poster: true } } }
      }),
      prisma.follow.findMany({
        where: { followingId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 2,
        select: { follower: { select: { avatar: true } } }
      })
    ]);

    const flag = user.country ? getCountryFlagUrl(user.country) : null;

    return NextResponse.json(
      { ...user, flagUrl: flag?.url ?? null, flagCountryName: flag?.countryName ?? user.country, followersPreview: followersPreview.map((f) => f.follower.avatar), reviews, ratings },
      { status: 200 }
    );
  } catch (error) {
    console.error('[api/mobile/profile]', error);
    return NextResponse.json({ error: 'Chyba při načítání profilu.' }, { status: 500 });
  }
}
