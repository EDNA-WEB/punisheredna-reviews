'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { IconTrash } from './Icons';

export default function DeleteBlogPostButton({ postId }: { postId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm('Opravdu chceš tento článek natrvalo smazat?')) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/blog/${postId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      router.push('/');
      router.refresh();
    } catch {
      alert('Smazání se nezdařilo. Zkus to prosím znovu.');
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      title="Smazat článek"
      aria-label="Smazat článek"
      className="w-8 h-8 rounded-full flex items-center justify-center text-muted border border-line hover:text-white hover:bg-danger hover:border-danger disabled:opacity-50"
    >
      <IconTrash className="w-4 h-4" />
    </button>
  );
}
