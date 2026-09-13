import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { validateImageDataUrl } from '@/lib/validateUpload';
import { uploadImage, deleteImageByUrl } from '@/lib/cloudinary';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') return null;
  return session;
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'Nemáš oprávnenie na túto akciu.' }, { status: 403 });

  const { name, role, subRole, photo, bio, birthDate, deathDate, birthPlace, deathPlace } = await req.json();
  if (!name || !String(name).trim()) return NextResponse.json({ error: 'Zadaj meno.' }, { status: 400 });
  const photoError = validateImageDataUrl(photo);
  if (photoError) return NextResponse.json({ error: photoError }, { status: 400 });

  const before = await prisma.person.findUnique({ where: { id: params.id }, select: { photo: true } });
  let photoUrl = photo || null;
  if (photoUrl && photoUrl.startsWith('data:image')) {
    photoUrl = await uploadImage(photoUrl, 'people');
  }

  const updated = await prisma.person.update({
    where: { id: params.id },
    data: {
      name: String(name).trim(),
      role: role === 'CREATOR' ? 'CREATOR' : 'ACTOR',
      subRole: subRole || null,
      photo: photoUrl,
      bio: bio || null,
      birthDate: birthDate ? new Date(birthDate) : null,
      deathDate: deathDate ? new Date(deathDate) : null,
      birthPlace: birthPlace || null,
      deathPlace: deathPlace || null
    }
  });

  if (before?.photo && before.photo !== photoUrl) await deleteImageByUrl(before.photo);

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'Nemáš oprávnenie na túto akciu.' }, { status: 403 });
  await prisma.person.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'Nemáš oprávnenie na túto akciu.' }, { status: 403 });
  const { approved } = await req.json();

  const before = await prisma.person.findUnique({ where: { id: params.id }, select: { approved: true, submittedById: true, name: true, slug: true } });
  const updated = await prisma.person.update({ where: { id: params.id }, data: { approved: !!approved } });

  if (approved === true && before && !before.approved && before.submittedById) {
    await prisma.notification.create({
      data: {
        userId: before.submittedById,
        actorName: 'PunisherEDNA',
        type: 'APPROVED',
        text: `Tvoj návrh osoby "${before.name}" bol schválený a je teraz na webe! Ďakujeme za príspevok.`,
        link: `/osobnost/${updated.slug}`
      }
    });
  }

  return NextResponse.json({ approved: updated.approved });
}
