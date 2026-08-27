'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function UserBanToggle({ id, banned }: { id: string; banned: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function toggle() {
    const action = banned ? 'odblokovať' : 'zablokovať';
    if (!confirm(`Naozaj chceš tohto používateľa ${action}?`)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ banned: !banned })
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      alert('Akcia zlyhala. Skús to prosím znova.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`text-xs font-semibold px-3.5 py-1.5 rounded-full border disabled:opacity-50 ${
        banned ? 'text-white bg-night border-night hover:bg-night/80' : 'text-danger border-danger hover:bg-danger hover:text-white'
      }`}
    >
      {banned ? 'Odblokovať' : 'Zablokovať'}
    </button>
  );
}
