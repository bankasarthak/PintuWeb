import type { NextConfig } from 'next'

const backendInternal =
  process.env.BACKEND_INTERNAL_URL?.replace(/\/$/, '') || 'http://127.0.0.1:8001'

const config: NextConfig = {
  images: {
    remotePatterns: [
      { hostname: 'localhost' },
      { hostname: '127.0.0.1' },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/backend/:path*',
        destination: `${backendInternal}/:path*`,
      },
    ]
  },
}

export default config
