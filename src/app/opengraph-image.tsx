import { ImageResponse } from 'next/og';

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #020617 0%, #0f172a 45%, #1e1b4b 100%)',
          color: '#ffffff',
          padding: '56px 64px',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', width: 56, height: 56, borderRadius: 16, background: '#4f46e5', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontWeight: 900, fontSize: 24 }}>
            O
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', fontSize: 34, fontWeight: 800 }}>
            <div style={{ display: 'flex' }}>Omnifit</div>
            <div style={{ display: 'flex', color: '#94a3b8', fontWeight: 500 }}>.cloud</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 900 }}>
          <div style={{ display: 'flex', fontSize: 66, fontWeight: 900, lineHeight: 1.05 }}>Satu Ekosistem AI untuk Keputusan yang Lebih Baik.</div>
          <div style={{ display: 'flex', fontSize: 30, lineHeight: 1.3, color: '#cbd5e1' }}>
            Dari evaluasi diri, analisis kripto real-time, hingga riset akademis — semua dalam satu platform terintegrasi.
          </div>
        </div>

        <div style={{ display: 'flex', gap: 16 }}>
          {[
            { name: 'Self Service AI', color: '#818cf8', bg: '#4f46e520' },
            { name: 'Crypto Intelligence', color: '#fbbf24', bg: '#d9770620' },
            { name: 'Study Workspace', color: '#34d399', bg: '#05966920' }
          ].map((item) => (
            <div
              key={item.name}
              style={{
                display: 'flex',
                border: `2px solid ${item.color}50`,
                background: item.bg,
                borderRadius: 999,
                padding: '12px 24px',
                fontSize: 22,
                color: item.color,
                fontWeight: 700,
              }}
            >
              {item.name}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
