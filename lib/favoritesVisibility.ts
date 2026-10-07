import { prisma } from './prisma';

// Viditeľnosť zoznamu „Obľúbené“ podľa nastavenia vlastníka
// (EVERYONE / LOGGED_IN / ONLY_FAVORITES / ONLY_ME). Rovnaké pravidlá ako
// v appke (api/mobile/user-profile) — teraz platia aj na webe.
export const FAVORITES_LIST_TITLE = 'Obľúbené';

export async function canSeeFavorites(
  owner: { id: string; favoritesVisibility?: string | null },
  viewerId: string | null | undefined,
  viewerIsAdmin = false
): Promise<boolean> {
  if (viewerIsAdmin || (viewerId && viewerId === owner.id)) return true;
  const v = owner.favoritesVisibility || 'EVERYONE';
  if (v === 'ONLY_ME') return false;
  if (v === 'LOGGED_IN') return !!viewerId;
  if (v === 'ONLY_FAVORITES') {
    if (!viewerId) return false;
    // „Obľúbení“ = ľudia, ktorých vlastník sleduje.
    const f = await prisma.follow.findUnique({ where: { followerId_followingId: { followerId: owner.id, followingId: viewerId } } });
    return !!f;
  }
  return true;
}
