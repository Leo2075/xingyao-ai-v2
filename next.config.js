/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // output: 'standalone', // 移除standalone配置，适用于Vercel
}

module.exports = nextConfig
