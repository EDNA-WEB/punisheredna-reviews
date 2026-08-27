'use client';

import { useState, useEffect } from 'react';

export default function ShareButtons({ title }: { title: string }) {
  const [url, setUrl] = useState('');
  useEffect(() => setUrl(window.location.href), []);

  const links = [
    { name: 'Facebook', color: '#1877F2', href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}` },
    { name: 'X', color: '#000000', href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}` },
    { name: 'WhatsApp', color: '#25D366', href: `https://wa.me/?text=${encodeURIComponent(title + ' ' + url)}` },
    { name: 'Telegram', color: '#26A5E4', href: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}` }
  ];

  return (
    <div className="grid grid-cols-4 rounded-xl overflow-hidden">
      {links.map((l) => (
        <a key={l.name} href={l.href} target="_blank" rel="noopener noreferrer" className="share-btn" style={{ backgroundColor: l.color }}>
          {l.name}
        </a>
      ))}
    </div>
  );
}
