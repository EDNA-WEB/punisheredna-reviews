import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect, notFound } from 'next/navigation';
import AdminTabs from '@/components/AdminTabs';
import PersonForm from '@/components/PersonForm';

export default async function EditPersonPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') redirect('/login');

  const person = await prisma.person.findUnique({ where: { id: params.id } });
  if (!person) return notFound();

  return (
    <div className="pt-8">
      <AdminTabs />
      <h1 className="font-display font-extrabold text-3xl text-ink mb-8">Upraviť osobu</h1>
      <PersonForm initial={person} />
    </div>
  );
}
