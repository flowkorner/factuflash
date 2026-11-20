import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Génération PDF côté serveur : bibliothèque chargée telle quelle par Node.
  serverExternalPackages: ['@react-pdf/renderer'],
  experimental: {
    // Logo jusqu'à 2 Mo envoyé avec le formulaire « Mon entreprise ».
    serverActions: { bodySizeLimit: '3mb' },
  },
};

export default nextConfig;
