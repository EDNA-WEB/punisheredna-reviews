import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { validateImageDataUrl } from '@/lib/validateUpload';
import { logAudit, summarizeArticleChanges } from '@/lib/auditLog';
import { uploadImage } from '@/lib/cloudinary';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Musíš byť prihlásený.' }, { status: 401 });
  const userId = (session.user as any).id;
  const isAdmin = (session.user as any).role === 'ADMIN';

  const post = await prisma.blogPost.findUnique({ where: { id: params.id } });
  if (!post) return NextResponse.json({ error: 'Článok sa nenašiel.' }, { status: 404 });
  if (post.authorId !== userId && !isAdmin) {
    return NextResponse.json({ error: 'Nemáš oprávnenie na túto akciu.' }, { status: 403 });
  }

  const { title, body, coverImage, isDraft, tags: rawTags } = await req.json();
  const data: Record<string, any> = {};

  if (title !== undefined) {
    const trimmedTitle = String(title || '').trim();
    if (!trimmedTitle) return NextResponse.json({ error: 'Vyplň prosím názov článku.' }, { status: 400 });
    if (trimmedTitle.length > 150) return NextResponse.json({ error: 'Názov je príliš dlhý (max. 150 znakov).' }, { status: 400 });
    data.title = trimmedTitle;
  }
  if (body !== undefined) {
    if (!body || !String(body).trim()) return NextResponse.json({ error: 'Text článku nemôže byť prázdny.' }, { status: 400 });
    if (String(body).length > 30000) return NextResponse.json({ error: 'Text je príliš dlhý (max. 30 000 znakov).' }, { status: 400 });
    data.body = String(body).trim();
  }
  if (coverImage !== undefined) {
    if (coverImage) {
      const imageError = validateImageDataUrl(coverImage);
      if (imageError) return NextResponse.json({ error: imageError }, { status: 400 });
    }
    let coverUrl = coverImage || null;
    if (coverUrl && coverUrl.startsWith('data:image')) {
      coverUrl = await uploadImage(coverUrl, 'articles/blog');
    }
    data.coverImage = coverUrl;
  }
  if (isDraft !== undefined) data.isDraft = !!isDraft;
  if (rawTags !== undefined) {
    const tags = Array.isArray(rawTags) ? rawTags.map((t: string) => String(t).trim().toLowerCase()).filter(Boolean) : [];
    if (tags.length < 5) return NextResponse.json({ error: 'Musíš pridať aspoň 5 tagov.' }, { status: 400 });
    data.tags = tags;
  }

  await prisma.articleRevision.create({
    data: {
      blogPostId: post.id,
      title: post.title,
      body: post.body,
      coverImage: post.coverImage,
      editedById: userId
    }
  });

  await prisma.blogPost.update({ where: { id: params.id }, data });

  await logAudit({
    userId,
    userName: (session.user as any).name || 'neznámy',
    action: 'updated',
    targetType: 'blog',
    targetId: post.id,
    targetTitle: data.title || post.title,
    details: summarizeArticleChanges(post, { ...post, ...data })
  });

  // Ak už bol článok publikovaný na hlavnej stránke, premietni úpravu aj tam.
  if (post.newsPostId) {
    const newsData: Record<string, any> = {};
    if (data.title) newsData.title = data.title;
    if (data.body) newsData.body = data.body;
    if ('coverImage' in data) newsData.coverImage = data.coverImage;
    if (Object.keys(newsData).length > 0) {
      await prisma.newsPost.update({ where: { id: post.newsPostId }, data: newsData }).catch(() => {});
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Musíš byť prihlásený.' }, { status: 401 });
  const userId = (session.user as any).id;
  const isAdmin = (session.user as any).role === 'ADMIN';

  const post = await prisma.blogPost.findUnique({ where: { id: params.id } });
  if (!post) return NextResponse.json({ error: 'Článok sa nenašiel.' }, { status: 404 });
  if (post.authorId !== userId && !isAdmin) {
    return NextResponse.json({ error: 'Nemáš oprávnenie na túto akciu.' }, { status: 403 });
  }

  await prisma.blogPost.delete({ where: { id: params.id } });

  await logAudit({
    userId,
    userName: (session.user as any).name || 'neznámy',
    action: 'deleted',
    targetType: 'blog',
    targetId: post.id,
    targetTitle: post.title
  });

  return NextResponse.json({ ok: true });
}
