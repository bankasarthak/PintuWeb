import type { NextConfig } from 'next'

const config: NextConfig = {
  images: {
    remotePatterns: [
      { hostname: 'localhost' },
      { hostname: '127.0.0.1' },
    ],
  },
}

export default config
