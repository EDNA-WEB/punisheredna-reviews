'use client';

import { useMemo, useState } from 'react';
import CommentItem from '../CommentItem';
import CommentForm from '../CommentForm';
import { useT } from '../TranslationProvider';

type C = React.ComponentProps<typeof CommentItem>['comment'];

// Diskusia pod článkom s prepínačom Nejlepší / Nejnovější.
export default function ArticleComments({
  comments,
  total,
  target,
  viewerId,
  isAdmin,
  isMember,
  articleAuthorId
}: {
  comments: C[];
  total: number;
  target: { newsId: string };
  viewerId?: string;
  isAdmin: boolean;
  isMember: boolean;
  articleAuthorId: string;
}) {
  const t = useT();
  const [sort, setSort] = useState<'best' | 'new'>('best');

  const likesOf = (c: C) => c.likes.filter((l) => l.value === 1).length;

  const sorted = useMemo(() => {
    const list = [...comments];
    if (sort === 'new') list.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    else list.sort((a, b) => likesOf(b) - likesOf(a) || +new Date(b.createdAt) - +new Date(a.createdAt));
    return list;
  }, [comments, sort]);

  // Odznak NEJLEPŠÍ len pri jasnom víťazovi (aspoň 2 palce a viac než ktokoľvek iný).
  const bestId = useMemo(() => {
    if (comments.length < 2) return undefined;
    const ranked = [...comments].sort((a, b) => likesOf(b) - likesOf(a));
    const top = likesOf(ranked[0]);
    return top >= 2 && top > likesOf(ranked[1]) ? ranked[0].id : undefined;
  }, [comments]);

  return (
    <section id="diskuze" className="scroll-mt-28">
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <h2 className="font-display font-bold text-[24px] tracking-tight text-ink">
          {t('clanok.diskuze', 'Diskuze')} <span className="text-muted font-semibold">{total}</span>
        </h2>
        {comments.length > 1 && (
          <div className="ap-segment ml-auto" role="tablist">
            <button type="button" role="tab" aria-selected={sort === 'best'} className={sort === 'best' ? 'is-on' : ''} onClick={() => setSort('best')}>
              {t('clanok.nejlepsi', 'Nejlepší')}
            </button>
            <button type="button" role="tab" aria-selected={sort === 'new'} className={sort === 'new' ? 'is-on' : ''} onClick={() => setSort('new')}>
              {t('clanok.nejnovejsi', 'Nejnovější')}
            </button>
          </div>
        )}
      </div>

      <div className="mb-7">
        <CommentForm target={target} />
      </div>

      {sorted.length === 0 ? (
        <p className="text-muted text-sm">{t('clanok.zadne_komentare', 'Zatím žádné komentáře. Buď první.')}</p>
      ) : (
        <div className="ap-comments">
          {sorted.map((c) => (
            <CommentItem
              key={c.id}
              comment={c}
              target={target}
              viewerId={viewerId}
              isAdmin={isAdmin}
              isMember={isMember}
              articleAuthorId={articleAuthorId}
              bestId={bestId}
            />
          ))}
        </div>
      )}
    </section>
  );
}
