'use client';

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="de">
      <body style={{ margin: 0, background: '#020617', color: '#ffffff', fontFamily: 'system-ui, sans-serif' }}>
        <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '24px', gap: '16px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 900, margin: 0 }}>Da ist etwas schiefgelaufen.</h1>
          <p style={{ color: '#94a3b8', maxWidth: '420px', margin: 0 }}>
            Die Anwendung konnte nicht geladen werden. Bitte versuche es erneut.
          </p>
          <button
            onClick={() => reset()}
            style={{ background: '#10b981', color: '#020617', fontWeight: 700, border: 'none', borderRadius: '16px', padding: '14px 28px', cursor: 'pointer' }}
          >
            Erneut versuchen
          </button>
        </main>
      </body>
    </html>
  );
}
