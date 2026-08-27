import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { slugify } from '@/lib/slugify';
import { validateImageDataUrl } from '@/lib/validateUpload';
import { uploadImage } from '@/lib/cloudinary';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const role = searchParams.get('role');
  const people = await prisma.person.findMany({
    where: { approved: true, ...(role ? { role: role as any } : {}) },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, slug: true, photo: true, role: true }
  });
  return NextResponse.json(people);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Musíš byť prihlásený.' }, { status: 401 });
  }
  const userId = (session.user as any).id;
  const isAdmin = (session.user as any).role === 'ADMIN';
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.banned) {
    return NextResponse.json({ error: 'Tvoj účet bol zablokovaný.' }, { status: 403 });
  }

  const { name, role, subRole, photo, bio, birthDate, deathDate, birthPlace, deathPlace } = await req.json();
  if (!name || !String(name).trim()) return NextResponse.json({ error: 'Zadaj meno.' }, { status: 400 });

  const duplicate = await prisma.person.findFirst({
    where: { name: { equals: String(name).trim(), mode: 'insensitive' } },
    select: { slug: true }
  });
  if (duplicate) {
    return NextResponse.json(
      { error: 'Osoba s týmto menom už v databáze existuje.', existingSlug: duplicate.slug },
      { status: 409 }
    );
  }

  const photoError = validateImageDataUrl(photo);
  if (photoError) {
    return NextResponse.json({ error: photoError }, { status: 400 });
  }

  let photoUrl = photo || null;
  if (photoUrl && photoUrl.startsWith('data:image')) {
    photoUrl = await uploadImage(photoUrl, 'people');
  }

  let slug = slugify(name);
  if (!slug) slug = 'osoba';
  let uniqueSlug = slug;
  let counter = 2;
  while (await prisma.person.findUnique({ where: { slug: uniqueSlug } })) {
    uniqueSlug = `${slug}-${counter}`;
    counter++;
  }

  const person = await prisma.person.create({
    data: {
      name: String(name).trim(),
      slug: uniqueSlug,
      role: role === 'CREATOR' ? 'CREATOR' : 'ACTOR',
      subRole: subRole || null,
      photo: photoUrl,
      bio: bio || null,
      birthDate: birthDate ? new Date(birthDate) : null,
      deathDate: deathDate ? new Date(deathDate) : null,
      birthPlace: birthPlace || null,
      deathPlace: deathPlace || null,
      approved: isAdmin,
      submittedById: isAdmin ? null : userId
    }
  });

  return NextResponse.json(person, { status: 201 });
}
