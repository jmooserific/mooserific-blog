/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // sharp's libvips shared library (@img/sharp-libvips-*) is loaded by the OS dynamic
  // linker, not require(), so file tracing misses it and the deployed function fails
  // with ERR_DLOPEN_FAILED. Force-include it for the route that uses sharp.
  outputFileTracingIncludes: {
    '/api/media/process': ['./node_modules/@img/sharp-libvips-*/**/*'],
  },
  images: {
    loader: 'custom',
    loaderFile: './src/lib/image-loader.ts',
    deviceSizes: [320, 480, 768, 1024],
    imageSizes: [120, 160, 240, 320],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''}`,
              "style-src 'self' 'unsafe-inline'",
              // blob: powers the admin editor's local image/video previews
              // (object URLs from files the author just picked, same-origin).
              "img-src 'self' https: data: blob:",
              "font-src 'self'",
              "connect-src 'self' https:",
              "media-src 'self' https: blob:",
              "frame-ancestors 'none'",
            ].join('; '),
          },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        ],
      },
    ];
  },
}

module.exports = nextConfig
