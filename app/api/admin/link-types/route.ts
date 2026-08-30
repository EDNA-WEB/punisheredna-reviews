import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { validateImageDataUrl } from '@/lib/validateUpload';
import { uploadImage } from '@/lib/cloudinary';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') return null;
  return session;
}

export async function GET() {
  const types = await prisma.movieLinkType.findMany({ orderBy: { order: 'asc' } });
  return NextResponse.json(types);
}

export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'Nemáš oprávnenie na túto akciu.' }, { status: 403 });

  const { name, icon, color } = await req.json();
  if (!name || !String(name).trim()) {
    return NextResponse.json({ error: 'Zadaj názov typu odkazu.' }, { status: 400 });
  }
  if (icon) {
    const imageError = validateImageDataUrl(icon);
    if (imageError) return NextResponse.json({ error: imageError }, { status: 400 });
  }

  let iconUrl = icon || null;
  if (iconUrl && iconUrl.startsWith('data:image')) {
    iconUrl = await uploadImage(iconUrl, 'link-types');
  }

  const count = await prisma.movieLinkType.count();
  const type = await prisma.movieLinkType.create({
    data: { name: String(name).trim(), icon: iconUrl, color: color || null, order: count }
  });

  return NextResponse.json(type, { status: 201 });
}
