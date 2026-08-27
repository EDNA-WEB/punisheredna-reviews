import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { slugify } from '@/lib/slugify';
import { publishedNewsFilter } from '@/lib/publishedFilter';
import { logAudit } from '@/lib/auditLog';
import { uploadImage } from '@/lib/cloudinary';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get('limit')) || 20;
  const news = await prisma.newsPost.findMany({
    where: publishedNewsFilter(),
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: { author: { select: { name: true } } }
  });
  return NextResponse.json(news);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Nemáš oprávnenie na túto akciu.' }, { status: 403 });
  }

  const data = await req.json();
  if (!data.title || !String(data.title).trim()) {
    return NextResponse.json({ error: 'Názov je povinný.' }, { status: 400 });
  }
  const tags = Array.isArray(data.tags) ? data.tags.map((t: string) => String(t).trim().toLowerCase()).filter(Boolean) : [];
  if (tags.length < 5) {
    return NextResponse.json({ error: 'Musíš pridať aspoň 5 tagov.' }, { status: 400 });
  }

  let slug = slugify(data.title);
  if (!slug) slug = 'novinka';
  let uniqueSlug = slug;
  let counter = 2;
  while (await prisma.newsPost.findUnique({ where: { slug: uniqueSlug } })) {
    uniqueSlug = `${slug}-${counter}`;
    counter++;
  }

  let coverUrl = data.coverImage || null;
  if (coverUrl && coverUrl.startsWith('data:image')) {
    coverUrl = await uploadImage(coverUrl, 'articles/news');
  }

  const news = await prisma.newsPost.create({
    data: {
      title: String(data.title).trim(),
      slug: uniqueSlug,
      summary: data.summary || '',
      body: data.body || '',
      coverImage: coverUrl,
      movieId: data.movieId || null,
      publishAt: data.publishAt ? new Date(data.publishAt) : null,
      isDraft: !!data.isDraft,
      tags,
      authorId: (session.user as any).id
    }
  });

  await logAudit({
    userId: (session.user as any).id,
    userName: (session.user as any).name || 'neznámy',
    action: data.isDraft ? 'created' : 'published',
    targetType: 'news',
    targetId: news.id,
    targetTitle: news.title,
    details: data.isDraft ? 'vytvoril ako koncept' : 'vytvoril a rovno zverejnil'
  });

  return NextResponse.json(news, { status: 201 });
}
