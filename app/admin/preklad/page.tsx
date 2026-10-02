import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import TranslationEditor from '@/components/TranslationEditor';
import SeedMembershipTranslationsButton from '@/components/SeedMembershipTranslationsButton';
import SeedLoginTranslationsButton from '@/components/SeedLoginTranslationsButton';
import SeedFooterTranslationsButton from '@/components/SeedFooterTranslationsButton';
import SeedSteamAuthTranslationsButton from '@/components/SeedSteamAuthTranslationsButton';
import { TRANSLATION_REGISTRY } from '@/lib/translationRegistry';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

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
    <div className="admin-page">
      <AdminPageHeader title={<>Překlad</>} />
      <p className="text-muted mb-6 max-w-2xl">
        Základní texty webu (navigace, tlačítka, popisky) — ne obsah recenzí ani článků, ten se nepřekládá. Čeština je hlavní jazyk webu a její výchozí znění je přímo v kódu; tady ho můžeš upravit a doplnit slovenský a anglický překlad.
      </p>
      <SeedMembershipTranslationsButton />
      <SeedLoginTranslationsButton />
      <SeedFooterTranslationsButton />
      <SeedSteamAuthTranslationsButton />
      <TranslationEditor
        initial={rows.map((r) => ({ key: r.key, group: r.group, sk: r.sk, en: r.en, cs: r.cs }))}
      />
    </div>
  );
}
