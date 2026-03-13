/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [], // Ajoutez vos domaines d'images si nécessaire
  },
  webpack: (config, { isServer }) => {
    // Résoudre le problème avec konva (uniquement côté serveur)
    if (isServer) {
      config.externals.push('canvas');
      config.resolve.fallback = {
        ...config.resolve.fallback,
        canvas: false,
        fs: false,
        path: false,
      };
    }
    return config;
  },
}

module.exports = nextConfig