/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  trailingSlash: false,
  generateBuildId: async () => {
    return 'build-' + Date.now()
  },
  experimental: {
    staticWorkerRequestDeduping: true,
  },
}

module.exports = nextConfig