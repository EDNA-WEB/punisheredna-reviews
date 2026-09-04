import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { uploadImage } from '@/lib/cloudinary';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Nemáš oprávnenie na túto akciu.' }, { status: 403 });
  }

  const data = await req.json();

  let imageUrl = data.image;
  if (imageUrl && imageUrl.startsWith('data:image')) {
    imageUrl = await uploadImage(imageUrl, 'shop/products');
  }

  // Varianty pri úprave jednoducho prepíšeme celé nanovo — jednoduchšie a bezpečnejšie
  // než dopočítavať rozdiely.
  if (data.variants) {
    await prisma.shopProductVariant.deleteMany({ where: { productId: params.id } });
  }

  const product = await prisma.shopProduct.update({
    where: { id: params.id },
    data: {
      ...(data.categoryId !== undefined ? { categoryId: data.categoryId } : {}),
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.image !== undefined ? { image: imageUrl || null } : {}),
      ...(data.platform !== undefined ? { platform: data.platform || null } : {}),
      ...(data.type !== undefined ? { type: data.type } : {}),
      ...(data.region !== undefined ? { region: data.region } : {}),
      ...(data.description !== undefined ? { description: data.description || null } : {}),
      ...(data.activationInfo !== undefined ? { activationInfo: data.activationInfo || null } : {}),
      ...(data.regionRestriction !== undefined ? { regionRestriction: data.regionRestriction || null } : {}),
      ...(data.rating !== undefined ? { rating: data.rating ? Number(data.rating) : null } : {}),
      ...(data.reviewCount !== undefined ? { reviewCount: Number(data.reviewCount) || 0 } : {}),
      ...(data.sponsored !== undefined ? { sponsored: !!data.sponsored } : {}),
      ...(data.sellerName !== undefined ? { sellerName: data.sellerName || null } : {}),
      ...(data.approved !== undefined ? { approved: !!data.approved } : {}),
      ...(data.variants
        ? {
            variants: {
              create: data.variants.map((v: any, i: number) => ({
                label: v.label,
                price: Number(v.price),
                originalPrice: v.originalPrice ? Number(v.originalPrice) : null,
                currency: v.currency || 'EUR',
                isBestDeal: !!v.isBestDeal,
                isGreatPrice: !!v.isGreatPrice,
                order: i
              }))
            }
          }
        : {})
    },
    include: { variants: true }
  });

  return NextResponse.json(product);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Nemáš oprávnenie na túto akciu.' }, { status: 403 });
  }

  await prisma.shopProduct.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
