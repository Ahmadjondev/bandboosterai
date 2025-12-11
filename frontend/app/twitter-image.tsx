import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'BandBooster AI - IELTS Preparation Platform';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #2563eb 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px',
        }}
      >
        {/* Logo Area */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '40px',
          }}
        >
          <div
            style={{
              width: '80px',
              height: '80px',
              background: 'white',
              borderRadius: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: '20px',
              fontSize: '40px',
            }}
          >
            📚
          </div>
          <span
            style={{
              fontSize: '48px',
              fontWeight: 'bold',
              color: 'white',
            }}
          >
            BandBooster AI
          </span>
        </div>

        {/* Main Title */}
        <h1
          style={{
            fontSize: '64px',
            fontWeight: 'bold',
            color: 'white',
            textAlign: 'center',
            margin: '0 0 20px 0',
            lineHeight: 1.2,
          }}
        >
          Master Your IELTS Journey
        </h1>

        {/* Subtitle */}
        <p
          style={{
            fontSize: '28px',
            color: 'rgba(255, 255, 255, 0.9)',
            textAlign: 'center',
            margin: '0 0 40px 0',
            maxWidth: '800px',
          }}
        >
          AI-powered mock tests, instant feedback & progress tracking
        </p>

        {/* Features */}
        <div
          style={{
            display: 'flex',
            gap: '40px',
            marginTop: '20px',
          }}
        >
          {['Listening', 'Reading', 'Writing', 'Speaking'].map((skill) => (
            <div
              key={skill}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                borderRadius: '12px',
                padding: '16px 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span
                style={{
                  fontSize: '22px',
                  color: 'white',
                  fontWeight: '600',
                }}
              >
                {skill}
              </span>
            </div>
          ))}
        </div>

        {/* Bottom URL */}
        <div
          style={{
            position: 'absolute',
            bottom: '30px',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <span
            style={{
              fontSize: '24px',
              color: 'rgba(255, 255, 255, 0.8)',
            }}
          >
            bandbooster.uz
          </span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
