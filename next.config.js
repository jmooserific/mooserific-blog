/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    domains: [process.env.R2_PUBLIC_HOSTNAME, 'photos.mooserific.org'],
    unoptimized: false,
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
