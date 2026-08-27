import { DEFAULT_GUIDE_ITEMS } from '@/lib/guideDefaults';
import GuideBody from '@/components/GuideBody';

export const dynamic = 'force-dynamic';

function slugifyQuestion(q: string): string {
  return q
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export default function GuidePage() {
  const items = DEFAULT_GUIDE_ITEMS.map((item) => ({ ...item, id: slugifyQuestion(item.question) }));

  return (
    <div className="pt-8">
      <h1 className="font-display font-extrabold text-3xl text-ink mb-2">Návod k použití</h1>
      <p className="text-muted mb-8">Odpovědi na nejčastější otázky o tom, jak PunisherEDNA reviews funguje.</p>
      <GuideBody items={items} />
    </div>
  );
}
