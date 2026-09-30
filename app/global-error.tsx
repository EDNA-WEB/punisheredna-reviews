'use client';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="sk">
      <body style={{ fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ paddingTop: '80px', textAlign: 'center' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '8px' }}>Něco se pokazilo</h1>
          <p style={{ color: '#6B6F76', marginBottom: '24px' }}>
            Omlouváme se, stránku se nepodařilo správně načíst.
          </p>
          <button
            onClick={reset}
            style={{
              background: '#E3141F',
              color: 'white',
              fontWeight: 600,
              padding: '10px 24px',
              borderRadius: '9999px',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Zkusit znovu
          </button>
        </div>
      </body>
    </html>
  );
}
