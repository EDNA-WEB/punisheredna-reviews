import { NextResponse } from 'next/server';
import { getMobileUser } from '@/lib/mobileAuth';
import { getFavoritesFeed, FeedType } from '@/lib/activityFeed';

export const dynamic = 'force-dynamic';

// Aktivita obľúbených pre appku — logika je v lib/activityFeed.ts (zdieľaná
// s webovou stránkou /aktivita). ?type=all|reviews|ratings|other, ?page=0,1,2…
export async function GET(req: Request) {
  try {
    const user = await getMobileUser(req);
    if (!user) return NextResponse.json({ error: 'Neplatné alebo vypršané prihlásenie.' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const rawType = searchParams.get('type') || 'all';
    const type = (['all', 'reviews', 'ratings', 'other'].includes(rawType) ? rawType : 'all') as FeedType;
    const page = Math.max(0, parseInt(searchParams.get('page') || '0', 10) || 0);

    const feed = await getFavoritesFeed(user.id, { type, page, pageSize: 10 });
    return NextResponse.json(feed, { status: 200 });
  } catch (error) {
    console.error('[api/mobile/favorites-activity]', error);
    return NextResponse.json({ error: 'Chyba pri načítaní aktivity.' }, { status: 500 });
  }
}
