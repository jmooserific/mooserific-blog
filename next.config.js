/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    loader: 'custom',
    loaderFile: './src/lib/image-loader.ts',
    deviceSizes: [320, 480, 768, 1024],
    imageSizes: [120, 160, 240, 320],
  },
}

module.exports = nextConfig
