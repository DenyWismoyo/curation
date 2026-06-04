import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Mengizinkan iframe dari domain luar
  async headers() {
    return [
      {
        // Hanya terapkan aturan ini untuk route /embed dan turunannya
        source: "/embed/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            // Ganti * dengan domain spesifik jika ingin membatasi (misal: "frame-ancestors 'self' https://client.com;")
            value: "frame-ancestors *;", 
          },
          {
            key: "X-Frame-Options",
            value: "ALLOWALL",
          }
        ],
      },
    ];
  },
};

export default nextConfig;