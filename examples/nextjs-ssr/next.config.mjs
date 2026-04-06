/** @type {import('next').NextConfig} */
const nextConfig = {
  // Transpile rustcn packages for Next.js
  transpilePackages: ['@rustcn/core', '@rustcn/react'],
  // Enable React Server Components (default in Next.js 14)
  experimental: {},
};

export default nextConfig;
