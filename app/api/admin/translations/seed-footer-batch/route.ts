import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { TRANSLATION_REGISTRY } from '@/lib/translationRegistry';

const SEED: Record<string, { en: string; cs: string }> = {
  'footer.mobilna_aplikacia': { en: 'Mobile app', cs: 'Mobilní aplikace' },
  'footer.socialne_siete': { en: 'Social media', cs: 'Sociální sítě' },
  'statspanel.na_webe_mame': { en: 'On the site we have', cs: 'Na webu máme' },
  'statspanel.profilov_cestina': { en: 'movie profiles in Czech', cs: 'profilů filmů v češtině' },
  'statspanel.dostupnych_online': { en: 'movies and series available online', cs: 'filmů a seriálů dostupných online' },
  'statspanel.z_celkovo': { en: 'out of', cs: 'z celkem' },
  'statspanel.titulov': { en: 'titles total', cs: 'titulů' }
};

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Nemáš oprávnenie na túto akciu.' }, { status: 403 });
  }

  let created = 0;
  let updated = 0;

  for (const [key, { en, cs }] of Object.entries(SEED)) {
    const existing = await prisma.translationString.findUnique({ where: { key } });
    if (existing) {
      const data: any = {};
      if (!existing.en) data.en = en;
      if (!existing.cs) data.cs = cs;
      if (Object.keys(data).length > 0) {
        await prisma.translationString.update({ where: { key }, data });
        updated++;
      }
    } else {
      const registryEntry = TRANSLATION_REGISTRY.find((e) => e.key === key);
      await prisma.translationString.create({
        data: { key, group: registryEntry?.group || 'Pätička', sk: registryEntry?.sk || key, en, cs }
      });
      created++;
    }
  }

  return NextResponse.json({ ok: true, created, updated, total: Object.keys(SEED).length });
}
