import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { uploadImage } from '@/lib/cloudinary';
import { validateImageDataUrl } from '@/lib/validateUpload';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const isAdmin = (session?.user as any)?.role === 'ADMIN';
  const isEditor = (session?.user as any)?.isEditor;
  if (!session || (!isAdmin && !isEditor)) {
    return NextResponse.json({ error: 'Nemáš oprávnenie na túto akciu.' }, { status: 403 });
  }

  const { dataUrl } = await req.json();
  const error = validateImageDataUrl(dataUrl);
  if (error) return NextResponse.json({ error }, { status: 400 });
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
