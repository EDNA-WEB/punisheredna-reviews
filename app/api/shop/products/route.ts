import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { slugify } from '@/lib/slugify';
import { uploadImage } from '@/lib/cloudinary';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Nemáš oprávnenie na túto akciu.' }, { status: 403 });
  }

  const data = await req.json();
  if (!data.title?.trim() || !data.categoryId) {
    return NextResponse.json({ error: 'Chýba názov alebo kategória.' }, { status: 400 });
  }

  let slug = slugify(data.title) || 'produkt';
  let uniqueSlug = slug;
  let counter = 2;
  while (await prisma.shopProduct.findUnique({ where: { slug: uniqueSlug } })) {
    uniqueSlug = `${slug}-${counter}`;
    counter++;
  }

  let imageUrl = data.image || null;
  if (imageUrl && imageUrl.startsWith('data:image')) {
    imageUrl = await uploadImage(imageUrl, 'shop/products');
  }

  const product = await prisma.shopProduct.create({
    data: {
      categoryId: data.categoryId,
      title: data.title.trim(),
      slug: uniqueSlug,
      image: imageUrl,
      platform: data.platform || null,
      type: data.type || 'Key',
      region: data.region || 'UNITED STATES',
      description: data.description || null,
      activationInfo: data.activationInfo || null,
      regionRestriction: data.regionRestriction || null,
      rating: data.rating ? Number(data.rating) : null,
      reviewCount: data.reviewCount ? Number(data.reviewCount) : 0,
      sponsored: !!data.sponsored,
      sellerName: data.sellerName || null,
      variants: {
        create: (data.variants || []).map((v: any, i: number) => ({
          label: v.label,
          price: Number(v.price),
          originalPrice: v.originalPrice ? Number(v.originalPrice) : null,
          currency: v.currency || 'USD',
          isBestDeal: !!v.isBestDeal,
          isGreatPrice: !!v.isGreatPrice,
          order: i
        }))
      }
    },
    include: { variants: true }
  });

  return NextResponse.json(product, { status: 201 });
}
