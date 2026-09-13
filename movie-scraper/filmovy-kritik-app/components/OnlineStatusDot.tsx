import { getOnlineStatus, ONLINE_STATUS_COLOR, ONLINE_STATUS_LABEL } from '@/lib/onlineStatus';

export default function OnlineStatusDot({ lastActivityAt, size = 'w-3.5 h-3.5' }: { lastActivityAt: Date | null; size?: string }) {
  const status = getOnlineStatus(lastActivityAt);

  return (
    <span
      className={`inline-block ${size} rounded-full border-2 border-card flex-none`}
      style={{ backgroundColor: ONLINE_STATUS_COLOR[status] }}
      title={ONLINE_STATUS_LABEL[status]}
      aria-label={ONLINE_STATUS_LABEL[status]}
    />
  );
}
