import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import BlogPostForm from '@/components/BlogPostForm';

export default async function NewBlogPostPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  return (
    <div className="pt-10">
      <h1 className="font-display font-extrabold text-3xl text-ink mb-2">Napísať článok</h1>
      <p className="text-sm text-muted mb-8">
        Článok sa zobrazí len na tvojom profile. Ak by si chcel(a), aby sa objavil aj na hlavnej stránke, priamo v
        článku potom môžeš požiadať o publikáciu.
      </p>
      <BlogPostForm />
    </div>
  );
}
