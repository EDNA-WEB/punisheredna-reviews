import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { slugify } from '@/lib/slugify';
import { tmdbSearchPerson, tmdbGetPersonDetails } from '@/lib/tmdb';
import { logBulkAction } from '@/lib/auditLog';

const MAX_NAMES = 25;

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Nemáš oprávnenie na túto akciu.' }, { status: 403 });
  }

  const { names } = await req.json();
  if (!Array.isArray(names) || names.length === 0) {
    return NextResponse.json({ error: 'Zadaj aspoň jedno meno.' }, { status: 400 });
  }

  // Odstránenie prázdnych riadkov a orezanie na maximálny povolený počet naraz —
  // hromadný import je náročný na TMDb API aj server, 25 je rozumná hranica.
  const cleanNames = Array.from(new Set(names.map((n: string) => String(n).trim()).filter(Boolean))).slice(0, MAX_NAMES);

  const results: { name: string; status: 'added' | 'duplicate' | 'not_found' | 'error'; slug?: string; existingSlug?: string }[] = [];

  for (const name of cleanNames) {
    try {
      // Ochrana proti duplicite — ak už osoba pod týmto menom v databáze
      // existuje, vynecháme ju a ideme ďalej, nech nevznikajú dve rovnaké karty.
      const duplicate = await prisma.person.findFirst({
        where: { name: { equals: name, mode: 'insensitive' } },
        select: { slug: true }
      });
      if (duplicate) {
        results.push({ name, status: 'duplicate', existingSlug: duplicate.slug });
        continue;
      }

      const searchResults = await tmdbSearchPerson(name);
      if (searchResults.length === 0) {
        results.push({ name, status: 'not_found' });
        continue;
      }

      // Zoberieme prvý (najrelevantnejší) výsledok z TMDb vyhľadávania.
      const best = searchResults[0];
      const details = await tmdbGetPersonDetails(best.id);

      // TMDb fotky sú už na ich vlastnom trvalom CDN — netreba ich kopírovať
      // do Cloudinary, to by len zbytočne plnilo úložisko.
      const photoUrl: string | null = details.photo;

      let slug = slugify(details.name || name);
      if (!slug) slug = 'osoba';
      let uniqueSlug = slug;
      let counter = 2;
      while (await prisma.person.findUnique({ where: { slug: uniqueSlug } })) {
        uniqueSlug = `${slug}-${counter}`;
        counter++;
      }

      await prisma.person.create({
        data: {
          name: details.name || name,
          slug: uniqueSlug,
          role: details.role === 'CREATOR' ? 'CREATOR' : 'ACTOR',
          photo: photoUrl,
          bio: details.bio || null,
          birthDate: details.birthDate ? new Date(details.birthDate) : null,
          deathDate: details.deathDate ? new Date(details.deathDate) : null,
          birthPlace: details.birthPlace || null,
          tmdbId: best.id,
          approved: true
        }
      });

      results.push({ name, status: 'added', slug: uniqueSlug });
    } catch (err) {
      console.error(`[bulk-add-people] Zlyhalo pri "${name}":`, err);
      results.push({ name, status: 'error' });
    }
  }

  await logBulkAction({
    userId: (session.user as any).id,
    userName: (session.user as any).name || 'neznámy',
    toolName: 'Hromadné pridanie osôb',
    updated: results.filter((r) => r.status === 'added').length,
    failed: results.filter((r) => r.status === 'error').length,
    total: names.length
  });

  return NextResponse.json({ results });
}
