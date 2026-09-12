'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Registrácia service workera nie je kritická pre fungovanie webu —
        // pri zlyhaní (napr. v developmente cez HTTP) jednoducho pokračujeme ďalej.
      });
    }
  }, []);

  return null;
}
