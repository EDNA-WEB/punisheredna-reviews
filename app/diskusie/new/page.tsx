import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import ThreadForm from '@/components/ThreadForm';

export default async function NewThreadPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  return (
    <div className="pt-8">
      <h1 className="font-display font-extrabold text-3xl text-ink mb-8">Nová téma</h1>
      <ThreadForm />
    </div>
  );
}
