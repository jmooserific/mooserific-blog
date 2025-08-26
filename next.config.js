/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    unoptimized: false,
    // Allow Cloudflare R2 public bucket domain (set R2_PUBLIC_HOSTNAME)
    remotePatterns: [
      {
        protocol: 'https',
        hostname: process.env.R2_PUBLIC_HOSTNAME,
        pathname: '/**',
      },
    ],
  },
}

module.exports = nextConfig
