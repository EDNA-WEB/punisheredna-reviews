import Link from 'next/link';
import { IconComment } from './Icons';

export default function NewsCard({
  news,
  isLatest,
  commentCount,
  novinkaLabel = 'Novinka'
}: {
  news: { title: string; slug: string; summary: string; coverImage: string | null; createdAt: string };
  isLatest?: boolean;
  commentCount?: number;
  novinkaLabel?: string;
}) {
  return (
    <Link href={`/news/${news.slug}`} className="block group">
      <div className="relative rounded-xl overflow-hidden bg-surface aspect-[16/10] mb-2.5">
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-[1.03]"
          style={news.coverImage ? { backgroundImage: `url('${news.coverImage}')` } : undefined}
        />
        {isLatest && (
          <span className="absolute top-2.5 left-2.5 bg-night text-white text-[11px] font-semibold px-2.5 py-1 rounded-full">
            {novinkaLabel}
          </span>
        )}
        {!!commentCount && (
          <span className="absolute bottom-2.5 right-2.5 bg-night/80 backdrop-blur-sm text-white text-[11px] font-semibold px-2 py-1 rounded-full flex items-center gap-1">
            <IconComment className="w-3 h-3" />
            {commentCount}
          </span>
        )}
      </div>
      <h4 className="font-display font-bold text-[15px] leading-snug text-ink group-hover:text-accent transition-colors mb-1">
        {news.title}
      </h4>
      <p className="text-xs text-muted line-clamp-2">{news.summary}</p>
    </Link>
  );
}
