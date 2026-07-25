import type { NextConfig } from "next";
import withPWA from "@ducanh2912/next-pwa";

const withPWAConfig = withPWA({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
  workboxOptions: {
    disableDevLogs: true,
  },
});

const nextConfig: NextConfig = {
  // Tambahkan baris ini untuk membisukan error Next.js 16 Turbopack
  turbopack: {},
  images: {
    remotePatterns: [
      // Google user profile photos (Firebase Auth / Google Sign-In)
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com',
      },
      // Google Cloud Storage (jika digunakan untuk user-uploaded assets)
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
      },
    ],
  },
};

export default withPWAConfig(nextConfig);