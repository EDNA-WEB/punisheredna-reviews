import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { validateImageDataUrl } from '@/lib/validateUpload';
import { logAudit } from '@/lib/auditLog';
import { uploadImage } from '@/lib/cloudinary';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Musíš byť prihlásený.' }, { status: 401 });
  const userId = (session.user as any).id;

  const { title, body, coverImage, isDraft, tags: rawTags } = await req.json();
  const trimmedTitle = String(title || '').trim();
  if (!trimmedTitle) return NextResponse.json({ error: 'Vyplň prosím názov článku.' }, { status: 400 });
  if (trimmedTitle.length > 150) return NextResponse.json({ error: 'Názov je príliš dlhý (max. 150 znakov).' }, { status: 400 });
  if (!body || !String(body).trim()) return NextResponse.json({ error: 'Text článku nemôže byť prázdny.' }, { status: 400 });
  if (String(body).length > 30000) return NextResponse.json({ error: 'Text je príliš dlhý (max. 30 000 znakov).' }, { status: 400 });
  const tags = Array.isArray(rawTags) ? rawTags.map((t: string) => String(t).trim().toLowerCase()).filter(Boolean) : [];
  if (tags.length < 5) return NextResponse.json({ error: 'Musíš pridať aspoň 5 tagov.' }, { status: 400 });

  if (coverImage) {
    const imageError = validateImageDataUrl(coverImage);
    if (imageError) return NextResponse.json({ error: imageError }, { status: 400 });
  }

  let coverUrl = coverImage || null;
  if (coverUrl && coverUrl.startsWith('data:image')) {
    coverUrl = await uploadImage(coverUrl, 'articles/blog');
  }

  const count = await prisma.blogPost.count({ where: { authorId: userId } });
  if (count >= 100) return NextResponse.json({ error: 'Máš už maximálny počet vlastných článkov (100).' }, { status: 400 });

  const post = await prisma.blogPost.create({
    data: { authorId: userId, title: trimmedTitle, body: String(body).trim(), coverImage: coverUrl, isDraft: !!isDraft, tags }
  });

  await logAudit({
    userId,
    userName: (session.user as any).name || 'neznámy',
    action: isDraft ? 'created' : 'published',
    targetType: 'blog',
    targetId: post.id,
    targetTitle: post.title,
    details: isDraft ? 'vytvoril ako koncept' : 'vytvoril a rovno zverejnil'
  });

  return NextResponse.json({ id: post.id });
}
