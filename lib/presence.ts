// "Online" znamená aktivita za posledných 5 minút — bez toho by sme potrebovali
// websockety na skutočnú okamžitú prítomnosť, čo je nad rámec bežného webu.
const ONLINE_THRESHOLD_MS = 5 * 60 * 1000;

export function formatPresence(lastActiveAt: Date): string {
  const diffMs = Date.now() - lastActiveAt.getTime();
  if (diffMs < ONLINE_THRESHOLD_MS) return 'online';

  const isToday = lastActiveAt.toDateString() === new Date().toDateString();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = lastActiveAt.toDateString() === yesterday.toDateString();

  const time = lastActiveAt.toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' });
  if (isToday) return `naposledy videný/á dnes o ${time}`;
  if (isYesterday) return `naposledy videný/á včera o ${time}`;
  return `naposledy videný/á ${lastActiveAt.toLocaleDateString('sk-SK')}`;
}

export function isOnline(lastActiveAt: Date): boolean {
  return Date.now() - lastActiveAt.getTime() < ONLINE_THRESHOLD_MS;
}
