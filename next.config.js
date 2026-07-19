/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        net: false,
        tls: false,
        fs: false,
        dns: false,
        child_process: false,
      }
    }
    return config
  },
  // Next.js 14 用 experimental.serverComponentsExternalPackages（15+才是顶层 serverExternalPackages）
  // 标记这些包不参与 webpack 打包，避免 pdf-parse/pdfjs 的 worker 文件在打包后找不到
  experimental: {
    serverComponentsExternalPackages: ['pg', 'pdf-parse', 'mammoth'],
  },
}

module.exports = nextConfig 