import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getMobileUser } from '@/lib/mobileAuth';
import { checkRateLimit } from '@/lib/antiSpam';
import { getOrCreateConversation } from '@/lib/conversation';
import { sendMessagePush, setTyping } from '@/lib/chatRealtime';
import {
  VOICE_MAX_BYTES,
  VOICE_MAX_MS,
  VOICE_MIN_MS,
  VOICE_TTL_MS,
  destroyVoice,
  sanitizeWaveform,
  uploadVoice,
  voicePreview,
  voiceView
} from '@/lib/voiceMessages';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Odoslanie hlasovky — LEN z appky (prihlásenie tokenom appky). Web túto
// routu použiť nevie: nemá appkový token a webová /api/messages hlasovky
// vôbec neprijíma. Rovnaký súhlas s konverzáciou, blokovanie aj limit ako text.
export async function POST(req: Request) {
  let uploadedId: string | null = null;
  try {
    const user = await getMobileUser(req);
    if (!user) return NextResponse.json({ error: 'Neplatné nebo vypršelé přihlášení.' }, { status: 401 });

    const senderId = user.id;
    const sender = await prisma.user.findUnique({ where: { id: senderId } });
    if (!sender || sender.banned) return NextResponse.json({ error: 'Tvůj účet byl zablokován.' }, { status: 403 });

    const form = await req.formData().catch(() => null);
    if (!form) return NextResponse.json({ error: 'Neplatné údaje.' }, { status: 400 });

    const receiverId = form.get('receiverId');
    const clientDuration = Number(form.get('durationMs'));
    const file = form.get('file');

    if (typeof receiverId !== 'string' || !receiverId || receiverId.length > 64 || receiverId === senderId) {
      return NextResponse.json({ error: 'Neplatný příjemce.' }, { status: 400 });
    }
    if (!file || typeof file === 'string' || typeof (file as any).arrayBuffer !== 'function') {
      return NextResponse.json({ error: 'Chybí nahrávka.' }, { status: 400 });
    }
    const blob = file as Blob;
    if (blob.size < 500) return NextResponse.json({ error: 'Nahrávka je příliš krátká.' }, { status: 400 });
    if (blob.size > VOICE_MAX_BYTES) return NextResponse.json({ error: 'Hlasovka může mít maximálně 1 minutu.' }, { status: 400 });
    if (!Number.isFinite(clientDuration) || clientDuration < VOICE_MIN_MS || clientDuration > VOICE_MAX_MS + 1500) {
      return NextResponse.json({ error: 'Hlasovka může mít maximálně 1 minutu.' }, { status: 400 });
    }
    const mime = blob.type && /^audio\//.test(blob.type) ? blob.type : 'audio/mp4';

    const rateLimitError = await checkRateLimit('message', senderId, sender.createdAt);
    if (rateLimitError) return NextResponse.json({ error: rateLimitError }, { status: 429 });

    const receiver = await prisma.user.findUnique({ where: { id: receiverId }, select: { id: true } });
    if (!receiver) return NextResponse.json({ error: 'Příjemce se nenašel.' }, { status: 404 });

    const blocked = await prisma.blockedUser.findFirst({
      where: {
        OR: [
          { blockerId: senderId, blockedId: receiverId },
          { blockerId: receiverId, blockedId: senderId }
        ]
      }
    });
    if (blocked) {
      const message = blocked.blockerId === senderId ? 'Tohoto uživatele jsi zablokoval.' : 'Tento uživatel tě zablokoval.';
      return NextResponse.json({ error: message }, { status: 403 });
    }

    const conversation = await getOrCreateConversation(senderId, receiverId, senderId);
    if (conversation.status === 'DECLINED') {
      return NextResponse.json({ error: 'Tato osoba odmítla s tebou komunikovat.' }, { status: 403 });
    }
    if (conversation.status === 'PENDING' && conversation.initiatorId === senderId) {
      const alreadySent = await prisma.message.count({ where: { senderId, receiverId } });
      if (alreadySent > 0) {
        return NextResponse.json({ error: 'Už jsi poslal jednu zprávu — počkej, až ji druhá strana potvrdí.' }, { status: 403 });
      }
    }

    const buffer = Buffer.from(await blob.arrayBuffer());
    const uploaded = await uploadVoice(buffer, mime);
    uploadedId = uploaded.publicId;

    // Dĺžku overí aj Cloudinary — upravený klient limit 1 minúty neobíde.
    const realDuration = uploaded.durationMs ?? clientDuration;
    if (realDuration > VOICE_MAX_MS + 1500) {
      await destroyVoice(uploaded.publicId);
      uploadedId = null;
      return NextResponse.json({ error: 'Hlasovka může mít maximálně 1 minutu.' }, { status: 400 });
    }
    const durationMs = Math.min(VOICE_MAX_MS, Math.max(VOICE_MIN_MS, Math.round(realDuration)));

    const now = Date.now();
    const message = await prisma.message.create({
      data: {
        senderId,
        receiverId,
        voice: true,
        audioPublicId: uploaded.publicId,
        audioFormat: uploaded.format,
        audioDuration: durationMs,
        audioWaveform: sanitizeWaveform(form.get('waveform')),
        audioExpiresAt: new Date(now + VOICE_TTL_MS)
      }
    });
    uploadedId = null; // už patrí správe — zmaže ho bežné upratovanie

    await Promise.all([
      setTyping(senderId, receiverId, false).catch(() => {}),
      sendMessagePush(receiverId, { id: sender.id, name: sender.name, avatar: sender.avatar }, voicePreview(durationMs))
    ]);

    return NextResponse.json(
      {
        id: message.id,
        senderId,
        body: null,
        image: null,
        read: false,
        createdAt: message.createdAt,
        voice: voiceView(message),
        conversationStatus: conversation.status
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[api/mobile/messages/voice]', error);
    if (uploadedId) await destroyVoice(uploadedId);
    return NextResponse.json({ error: 'Hlasovku se nepodařilo odeslat. Zkus to prosím znovu.' }, { status: 400 });
  }
}
