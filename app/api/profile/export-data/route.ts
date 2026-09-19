import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { tryDecryptMessageBody } from '@/lib/serverCrypto';

// GDPR čl. 20 — právo na prenositeľnosť údajov. Zozbiera hlavné osobné dáta
// a obsah, čo používateľ na webe vytvoril, a vráti ich ako jeden stiahnuteľný
// JSON súbor. Nezahŕňa systémové/administratívne záznamy (napr. IP adresy
// pri moderovaní), len obsah priamo súvisiaci s používateľom.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Musíš byť prihlásený.' }, { status: 401 });

  const userId = (session.user as any).id;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: 'Používateľ sa nenašiel.' }, { status: 404 });

  const [
    reviews,
    ratings,
    comments,
    watchlist,
    movieLists,
    movieNotes,
    seasonNotes,
    episodeNotes,
    threads,
    posts,
    sentMessages,
    following,
    followedBy,
    personFollows
  ] = await Promise.all([
    prisma.review.findMany({ where: { authorId: userId }, select: { body: true, createdAt: true, movie: { select: { title: true } } } }),
    prisma.rating.findMany({ where: { userId }, select: { value: true, createdAt: true, movie: { select: { title: true } } } }),
    prisma.comment.findMany({ where: { userId }, select: { body: true, createdAt: true } }),
    prisma.watchlistItem.findMany({ where: { userId }, select: { createdAt: true, movie: { select: { title: true } } } }),
    prisma.movieList.findMany({ where: { authorId: userId }, select: { title: true, createdAt: true } }),
    prisma.movieNote.findMany({ where: { userId }, select: { body: true, updatedAt: true, movie: { select: { title: true } } } }),
    prisma.seasonNote.findMany({ where: { userId }, select: { body: true, updatedAt: true } }),
    prisma.episodeNote.findMany({ where: { userId }, select: { body: true, updatedAt: true } }),
    prisma.thread.findMany({ where: { authorId: userId }, select: { title: true, body: true, createdAt: true } }),
    prisma.post.findMany({ where: { authorId: userId }, select: { body: true, createdAt: true } }),
    prisma.message.findMany({ where: { senderId: userId }, select: { body: true, iv: true, createdAt: true, receiver: { select: { name: true } } } }),
    prisma.follow.findMany({ where: { followerId: userId }, select: { following: { select: { name: true } } } }),
    prisma.follow.findMany({ where: { followingId: userId }, select: { follower: { select: { name: true } } } }),
    prisma.personFollow.findMany({ where: { userId }, select: { person: { select: { name: true } } } })
  ]);

  const data = {
    exportDate: new Date().toISOString(),
    profil: {
      meno: user.name,
      email: user.email,
      krstneMeno: user.firstName,
      priezvisko: user.lastName,
      datumNarodenia: user.birthDate,
      bio: user.bio,
      tagline: user.tagline,
      krajina: user.country,
      registrovanyOd: user.createdAt,
      jazyk: user.language
    },
    recenzie: reviews.map((r) => ({ film: r.movie.title, text: r.body, datum: r.createdAt })),
    hodnotenia: ratings.map((r) => ({ film: r.movie.title, hodnota: r.value, datum: r.createdAt })),
    komentare: comments.map((c) => ({ text: c.body, datum: c.createdAt })),
    watchlist: watchlist.map((w) => ({ film: w.movie.title, pridane: w.createdAt })),
    zoznamy: movieLists.map((l) => ({ nazov: l.title, vytvorene: l.createdAt })),
    poznamkyKFilmom: movieNotes.map((n) => ({ film: n.movie.title, text: n.body, upravene: n.updatedAt })),
    poznamkyKSezonam: seasonNotes.map((n) => ({ text: n.body, upravene: n.updatedAt })),
    poznamkyKEpizodam: episodeNotes.map((n) => ({ text: n.body, upravene: n.updatedAt })),
    diskusneVlakna: threads.map((t) => ({ nazov: t.title, text: t.body, vytvorene: t.createdAt })),
    diskusnePrispevky: posts.map((p) => ({ text: p.body, datum: p.createdAt })),
    odoslaneSpravy: sentMessages.map((m) => ({
      prijemca: m.receiver.name,
      text: m.body && m.iv ? tryDecryptMessageBody(m.body, m.iv) : '[obrázok alebo nedešifrovateľný obsah]',
      datum: m.createdAt
    })),
    sledujem: following.map((f) => f.following.name),
    sledujuMa: followedBy.map((f) => f.follower.name),
    sledovaneOsobnosti: personFollows.map((p) => p.person.name)
  };

  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="moje-udaje-${user.name}.json"`
    }
  });
}
