export default function GoldenTicketBadge({ size = 18 }: { size?: number }) {
  return (
    <img
      src="/golden-ticket-badge.svg"
      alt="Golden Ticket člen"
      title="Golden Ticket člen"
      width={size}
      height={size}
      className="inline-block flex-none"
    />
  );
}
