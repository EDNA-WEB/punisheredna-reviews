import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import MovieForm from '@/components/MovieForm';

export default async function NewMoviePage({ searchParams }: { searchParams: { type?: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') redirect('/login');

  const type = searchParams?.type === 'Seriál' || searchParams?.type === 'TV film' ? searchParams.type : 'Film';
  const title = type === 'Seriál' ? 'Pridať seriál' : type === 'TV film' ? 'Pridať TV film' : 'Pridať film';

  return (
    <div className="pt-8">
      <div className="text-xs font-semibold text-accent uppercase tracking-wider mb-1">Administrácia</div>
      <h1 className="font-display font-extrabold text-3xl text-ink mb-8">{title}</h1>
      <MovieForm initial={{ contentType: type }} />
    </div>
  );
}
