export type OnlineStatus = 'online' | 'recent' | 'offline';

// Zelená = online (aktivita za posledných 5 minút)
// Oranžová = bol tu nedávno (aktivita dnes, ale nie za posledných 5 minút)
// Červená = dnes tu ani na webe nebol (alebo tu ešte nikdy nebol)
export function getOnlineStatus(lastActivityAt: Date | null): OnlineStatus {
  if (!lastActivityAt) return 'offline';

  const now = new Date();
  const diffMinutes = (now.getTime() - lastActivityAt.getTime()) / 60_000;
  if (diffMinutes <= 5) return 'online';

  const isToday =
    lastActivityAt.getFullYear() === now.getFullYear() &&
    lastActivityAt.getMonth() === now.getMonth() &&
    lastActivityAt.getDate() === now.getDate();

  return isToday ? 'recent' : 'offline';
}

export const ONLINE_STATUS_COLOR: Record<OnlineStatus, string> = {
  online: '#22C55E',
  recent: '#F59E0B',
  offline: '#EF4444'
};

export const ONLINE_STATUS_LABEL: Record<OnlineStatus, string> = {
  online: 'Online',
  recent: 'Bol(a) tu nedávno',
  offline: 'Dnes tu nebol(a)'
};
