import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import AdminTabs from '@/components/AdminTabs';
import TranslationEditor from '@/components/TranslationEditor';
import { TRANSLATION_REGISTRY } from '@/lib/translationRegistry';

export const dynamic = 'force-dynamic';

export default async function AdminTranslationsPage() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') redirect('/login');

  // Zosynchronizuj register kľúčov do databázy (nové pridá, existujúce EN/CS nechá tak)
  await Promise.all(
    TRANSLATION_REGISTRY.map((entry) =>
      prisma.translationString.upsert({
        where: { key: entry.key },
        update: { sk: entry.sk, group: entry.group },
        create: { key: entry.key, group: entry.group, sk: entry.sk }
      })
    )
  );

  const rows = await prisma.translationString.findMany({ orderBy: [{ group: 'asc' }, { key: 'asc' }] });

  return (
    <div className="pt-8">
      <AdminTabs />
      <div className="text-xs font-semibold text-accent uppercase tracking-wider mb-1">Administrácia</div>
      <h1 className="font-display font-extrabold text-3xl text-ink mb-2">Preklad</h1>
      <p className="text-muted mb-6 max-w-2xl">
        Základné texty webu (navigácia, tlačidlá, popisky) — nie obsah recenzií ani novinových článkov, ten sa neprekladá.
        Slovenčina je zdroj, doplň k nej anglický a český preklad.
      </p>
      <TranslationEditor
        initial={rows.map((r) => ({ key: r.key, group: r.group, sk: r.sk, en: r.en, cs: r.cs }))}
      />
    </div>
  );
}
