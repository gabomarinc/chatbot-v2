import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Explicitly set the pages directory
  pageExtensions: ['ts', 'tsx', 'js', 'jsx'],
  serverExternalPackages: ['pdf2json', 'imapflow'],
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb',
    },
  },
};

export default nextConfig;
