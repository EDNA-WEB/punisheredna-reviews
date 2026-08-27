import { prisma } from './prisma';

type LogParams = {
  userId: string;
  userName: string;
  action: 'created' | 'updated' | 'published' | 'unpublished' | 'deleted' | 'reverted';
  targetType: 'news' | 'blog';
  targetId: string;
  targetTitle: string;
  details?: string;
};

// Zapíše záznam do audit logu — nikdy nezhodí požiadavku, ak by zápis zlyhal
// (audit log je "sekundárna" informácia, hlavná akcia musí prejsť aj bez neho).
export async function logAudit(params: LogParams) {
  await prisma.auditLog.create({ data: params }).catch(() => {});
}

// Porovná starý a nový stav článku a vráti čitateľné zhrnutie zmien,
// napr. "zmenil názov · telo článku (+180 znakov) · pridal 2 tagy".
export function summarizeArticleChanges(
  before: { title: string; body: string; tags?: string[]; isDraft?: boolean; coverImage?: string | null },
  after: { title: string; body: string; tags?: string[]; isDraft?: boolean; coverImage?: string | null }
): string {
  const parts: string[] = [];
  if (before.title !== after.title) parts.push(`zmenil názov ("${before.title}" → "${after.title}")`);
  if (before.body !== after.body) {
    const diff = after.body.length - before.body.length;
    parts.push(`upravil telo článku (${diff >= 0 ? '+' : ''}${diff} znakov)`);
  }
  if (before.coverImage !== after.coverImage) parts.push('zmenil titulný obrázok');
  if (before.tags && after.tags) {
    const added = after.tags.filter((t) => !before.tags!.includes(t));
    const removed = before.tags.filter((t) => !after.tags!.includes(t));
    if (added.length) parts.push(`pridal tagy: ${added.join(', ')}`);
    if (removed.length) parts.push(`odobral tagy: ${removed.join(', ')}`);
  }
  if (before.isDraft !== undefined && after.isDraft !== undefined && before.isDraft !== after.isDraft) {
    parts.push(after.isDraft ? 'vrátil do rozpísaného stavu' : 'zverejnil');
  }
  return parts.length > 0 ? parts.join(' · ') : 'bez zmeny obsahu';
}
