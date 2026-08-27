import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect, notFound } from 'next/navigation';
import BlogPostForm from '@/components/BlogPostForm';
import RevisionHistory from '@/components/RevisionHistory';

export default async function EditBlogPostPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  const post = await prisma.blogPost.findUnique({ where: { id: params.id } });
  if (!post) return notFound();

  const isOwn = post.authorId === (session.user as any).id;
  const isAdmin = (session.user as any).role === 'ADMIN';
  if (!isOwn && !isAdmin) redirect(`/blog/${post.id}`);

  return (
    <div className="pt-10">
      <h1 className="font-display font-extrabold text-3xl text-ink mb-6">Upraviť článok</h1>
      <div className="max-w-2xl mb-6">
        <RevisionHistory apiBase={`/api/blog/${post.id}`} />
      </div>
      <BlogPostForm initial={{ id: post.id, title: post.title, body: post.body, coverImage: post.coverImage, isDraft: post.isDraft, tags: post.tags }} />
    </div>
  );
}
