import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect, notFound } from 'next/navigation';
import PersonForm from '@/components/PersonForm';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

export default async function EditPersonPage(props: { params: Promise<{ id: string }> }) {
  const { params } = { ...props, params: await props.params };
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') redirect('/login');

  const person = await prisma.person.findUnique({ where: { id: params.id } });
  if (!person) return notFound();

  return (
    <div className="admin-page">
      <AdminPageHeader title={<>Upravit osobu</>} />
      <PersonForm initial={person} />
    </div>
  );
}
