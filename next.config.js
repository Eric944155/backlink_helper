/** @type {import('next').NextConfig} */
const nextConfig = {
  // 允许在 API 里用 Node.js 内置模块（http/https/zlib/crypto/dns）
  serverExternalPackages: [],
};

module.exports = nextConfig;
