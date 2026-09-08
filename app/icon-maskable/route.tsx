import { ImageResponse } from 'next/og';

export const runtime = 'nodejs';
export const dynamic = 'force-static';

const SIZE = 512;

/**
 * Maskable variant: Android can crop this into a circle/squircle, so the
 * "PM" mark sits well inside the safe zone (roughly the center 80%) rather
 * than filling the canvas edge-to-edge like icon-512.
 */
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
        }}
      >
        <div
          style={{
            fontSize: 176,
            fontWeight: 700,
            color: '#ffffff',
            fontFamily: 'sans-serif',
            letterSpacing: -4,
          }}
        >
          PM
        </div>
      </div>
    ),
    { width: SIZE, height: SIZE },
  );
}
