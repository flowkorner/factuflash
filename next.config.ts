import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    // Logo jusqu'à 2 Mo envoyé avec le formulaire « Mon entreprise ».
    serverActions: { bodySizeLimit: '3mb' },
  },
};

export default nextConfig;
