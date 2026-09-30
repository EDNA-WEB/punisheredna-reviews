import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { slugify } from '@/lib/slugify';

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { params } = { ...ctx, params: await ctx.params };
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Nemáš oprávnění k této akci.' }, { status: 403 });
  }

  const post = await prisma.blogPost.findUnique({ where: { id: params.id } });
  if (!post) return NextResponse.json({ error: 'Článek se nenašel.' }, { status: 404 });
  if (post.published) return NextResponse.json({ error: 'Tento článek je už publikovaný.' }, { status: 400 });

  // Jedinečný slug — ak je názov už obsadený, pridá číselnú príponu.
  const baseSlug = slugify(post.title);
  let slug = baseSlug;
  let n = 1;
  while (await prisma.newsPost.findUnique({ where: { slug } })) {
    n++;
    slug = `${baseSlug}-${n}`;
  }

  const summary = post.body.replace(/[#*_`>[\]()]/g, '').slice(0, 200);

  const news = await prisma.newsPost.create({
    data: {
      title: post.title,
      slug,
      summary,
      body: post.body,
      coverImage: post.coverImage,
      authorId: post.authorId
    }
  });

  await prisma.blogPost.update({
    where: { id: params.id },
    data: { published: true, newsPostId: news.id }
  });

  await prisma.notification.create({
    data: {
      userId: post.authorId,
      actorName: 'Systém',
      type: 'BLOG_PUBLISHED',
      text: `Tvůj článek "${post.title}" byl schválen a zveřejněn na hlavní stránce`,
      link: `/news/${slug}`
    }
  });

  return NextResponse.json({ ok: true, slug });
}
