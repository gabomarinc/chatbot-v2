import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Explicitly set the pages directory
  pageExtensions: ['ts', 'tsx', 'js', 'jsx'],
  serverExternalPackages: ['pdf2json'],
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};

export default nextConfig;
