import { ImageResponse } from 'next/og';

export const runtime = 'nodejs';
export const dynamic = 'force-static';

const SIZE = 192;

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#1f3a5f',
          color: '#ffffff',
          fontSize: 92,
          fontWeight: 700,
          fontFamily: 'sans-serif',
          letterSpacing: -2,
        }}
      >
        PM
      </div>
    ),
    { width: SIZE, height: SIZE },
  );
}
