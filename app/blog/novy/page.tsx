import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import BlogPostForm from '@/components/BlogPostForm';

export default async function NewBlogPostPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  return (
    <div className="pt-10">
      <h1 className="font-display font-extrabold text-3xl text-ink mb-2">Napsat článek</h1>
      <p className="text-sm text-muted mb-8">
        Článek se zobrazí jen na tvém profilu. Pokud bys chtěl(a), aby se objevil i na hlavní stránce, přímo v článku pak můžeš požádat o publikaci.
      </p>
      <BlogPostForm />
    </div>
  );
}
