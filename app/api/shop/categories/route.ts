import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { slugify } from '@/lib/slugify';

export async function GET() {
  const categories = await prisma.shopCategory.findMany({
    orderBy: { order: 'asc' },
    include: { _count: { select: { products: { where: { approved: true } } } } }
  });
  return NextResponse.json(categories);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Nemáš oprávnenie na túto akciu.' }, { status: 403 });
  }

  const { name, icon } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: 'Chýba názov kategórie.' }, { status: 400 });

  let slug = slugify(name) || 'kategoria';
  let uniqueSlug = slug;
  let counter = 2;
  while (await prisma.shopCategory.findUnique({ where: { slug: uniqueSlug } })) {
    uniqueSlug = `${slug}-${counter}`;
    counter++;
  }

  const maxOrder = await prisma.shopCategory.aggregate({ _max: { order: true } });
  const category = await prisma.shopCategory.create({
    data: { name: name.trim(), slug: uniqueSlug, icon: icon || null, order: (maxOrder._max.order ?? 0) + 1 }
  });

  return NextResponse.json(category, { status: 201 });
}
