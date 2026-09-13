'use client';

import { signOut } from 'next-auth/react';

export default function SignOutButton({ className, label }: { className?: string; label?: string }) {
  return (
    <button onClick={() => signOut({ callbackUrl: '/' })} className={className}>
      {label || 'Odhlásiť sa'}
    </button>
  );
}
