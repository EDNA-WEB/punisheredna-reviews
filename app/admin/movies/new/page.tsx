import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import MovieFormWithTmdbImport from '@/components/MovieFormWithTmdbImport';

export default async function NewMoviePage(props: { searchParams: Promise<{ type?: string }> }) {
  const { searchParams } = { ...props, searchParams: await props.searchParams };
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') redirect('/login');

  const type = searchParams?.type === 'Seriál' || searchParams?.type === 'TV film' ? searchParams.type : 'Film';
  const title = type === 'Seriál' ? 'Přidat seriál' : type === 'TV film' ? 'Přidat TV film' : 'Přidat film';

  return (
    <div className="pt-8">
      <div className="text-xs font-semibold text-accent uppercase tracking-wider mb-1">Administrácia</div>
      <h1 className="font-display font-extrabold text-3xl text-ink mb-8">{title}</h1>
      <MovieFormWithTmdbImport contentType={type} />
    </div>
  );
}
