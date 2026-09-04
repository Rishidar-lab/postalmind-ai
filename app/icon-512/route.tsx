import { ImageResponse } from 'next/og';

export const runtime = 'nodejs';
export const dynamic = 'force-static';

const SIZE = 512;

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
          fontSize: 244,
          fontWeight: 700,
          fontFamily: 'sans-serif',
          letterSpacing: -6,
        }}
      >
        PM
      </div>
    ),
    { width: SIZE, height: SIZE },
  );
}
