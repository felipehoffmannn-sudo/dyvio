/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      { protocol: 'https', hostname: 'appleid.cdn-apple.com' },
    ],
  },
  // Experimental: stale times para navegação mais rápida
  experimental: {
    staleTimes: {
      static: 180, // 3 min para páginas estáticas
      dynamic: 30, // 30s para páginas dinâmicas
    },
  },
}

module.exports = nextConfig
