import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { uploadImage } from '@/lib/cloudinary';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Nemáš oprávnenie na túto akciu.' }, { status: 403 });
  }

  const { dataUrl } = await req.json();
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image')) {
    return NextResponse.json({ error: 'Neplatný obrázok.' }, { status: 400 });
  }

  try {
    // Nahráme obrázok na Cloudinary a vrátime krátku URL — tá sa vloží do
    // textu článku namiesto celej base64 dátovej URL (tá mala tisíce znakov
    // a rýchlo napĺňala limit dĺžky obsahu článku).
    const url = await uploadImage(dataUrl, 'news/content');
    return NextResponse.json({ url });
  } catch {
    return NextResponse.json({ error: 'Nahratie obrázka zlyhalo.' }, { status: 500 });
  }
}
