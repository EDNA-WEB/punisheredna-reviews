import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logAudit, summarizeArticleChanges } from '@/lib/auditLog';
import { uploadImage } from '@/lib/cloudinary';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') return null;
  return session;
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'Nemáš oprávnenie na túto akciu.' }, { status: 403 });

  const data = await req.json();
  if (!data.title || !String(data.title).trim()) {
    return NextResponse.json({ error: 'Názov je povinný.' }, { status: 400 });
  }
  const tags = Array.isArray(data.tags) ? data.tags.map((t: string) => String(t).trim().toLowerCase()).filter(Boolean) : [];
  if (tags.length < 5) {
    return NextResponse.json({ error: 'Musíš pridať aspoň 5 tagov.' }, { status: 400 });
  }

  const before = await prisma.newsPost.findUnique({ where: { id: params.id } });
  if (!before) return NextResponse.json({ error: 'Novinka sa nenašla.' }, { status: 404 });

  await prisma.articleRevision.create({
    data: {
      newsPostId: before.id,
      title: before.title,
      summary: before.summary,
      body: before.body,
      coverImage: before.coverImage,
      editedById: (session.user as any).id
    }
  });

  let coverUrl = data.coverImage || null;
  if (coverUrl && coverUrl.startsWith('data:image')) {
    coverUrl = await uploadImage(coverUrl, 'articles/news');
  }

  const updated = await prisma.newsPost.update({
    where: { id: params.id },
    data: {
      title: String(data.title).trim(),
      summary: data.summary || '',
      body: data.body || '',
      coverImage: coverUrl,
      movieId: data.movieId || null,
      publishAt: data.publishAt ? new Date(data.publishAt) : null,
      isDraft: !!data.isDraft,
      tags
    }
  });

  await logAudit({
    userId: (session.user as any).id,
    userName: (session.user as any).name || 'neznámy',
    action: 'updated',
    targetType: 'news',
    targetId: updated.id,
    targetTitle: updated.title,
    details: summarizeArticleChanges(before, updated)
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'Nemáš oprávnenie na túto akciu.' }, { status: 403 });

  const news = await prisma.newsPost.findUnique({ where: { id: params.id } });
  if (!news) return NextResponse.json({ error: 'Novinka sa nenašla.' }, { status: 404 });

  await prisma.newsPost.delete({ where: { id: params.id } });

  await logAudit({
    userId: (session.user as any).id,
    userName: (session.user as any).name || 'neznámy',
    action: 'deleted',
    targetType: 'news',
    targetId: news.id,
    targetTitle: news.title
  });

  return NextResponse.json({ ok: true });
}
