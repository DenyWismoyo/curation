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
          background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 45%, #2563eb 100%)',
          color: '#ffffff',
          padding: '56px 64px',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1d4ed8', fontWeight: 900, fontSize: 22 }}>
            O
          </div>
          <div style={{ fontSize: 34, fontWeight: 800 }}>Omnifit</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 860 }}>
          <div style={{ fontSize: 66, fontWeight: 900, lineHeight: 1.05 }}>Smart Assessment System</div>
          <div style={{ fontSize: 30, lineHeight: 1.3, color: '#dbeafe' }}>
            Asesmen AI untuk personal, komunitas, dan bisnis dengan insight yang bisa langsung dieksekusi.
          </div>
        </div>

        <div style={{ display: 'flex', gap: 14 }}>
          {['Katalog Modul', 'Explore Insight', 'Action Plan AI'].map((item) => (
            <div
              key={item}
              style={{
                border: '1px solid rgba(255,255,255,0.35)',
                borderRadius: 999,
                padding: '10px 20px',
                fontSize: 22,
                color: '#e0ecff',
              }}
            >
              {item}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
