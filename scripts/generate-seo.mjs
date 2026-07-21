// scripts/generate-seo.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Base URL disesuaikan ke omnifit.cloud
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://omnifit.cloud';
const publicDir = path.resolve(__dirname, '..', 'public');

// 1. Susun isi robots.txt
const robotsTxt = `User-Agent: *
Allow: /
Allow: /katalog
Allow: /mitra
Allow: /assessment
Allow: /token

Disallow: /admin/
Disallow: /assessor/
Disallow: /curator/
Disallow: /dashboard/
Disallow: /workspace/
Disallow: /result/
Disallow: /api/

Sitemap: ${baseUrl}/sitemap.xml
`;

// 2. Susun isi sitemap.xml
const pages = [
  { path: '', freq: 'yearly', priority: '1.0' },
  { path: '/katalog', freq: 'weekly', priority: '0.9' },
  { path: '/mitra', freq: 'monthly', priority: '0.8' },
  { path: '/assessment', freq: 'always', priority: '0.9' },
  { path: '/token', freq: 'yearly', priority: '0.5' },
];

const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(page => `  <url>
    <loc>${baseUrl}${page.path}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>${page.freq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

// 3. Eksekusi Penulisan File
try {
  console.log(`\n  Memulai proses generate SEO statis untuk ${baseUrl}...`);
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  fs.writeFileSync(path.join(publicDir, 'robots.txt'), robotsTxt.trim());
  console.log('  ✅ BERHASIL: public/robots.txt telah dibuat.');

  fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), sitemapXml.trim());
  console.log('  ✅ BERHASIL: public/sitemap.xml telah dibuat.\n');

} catch (error) {
  console.error('  ❌ GAGAL: Terjadi kesalahan saat membuat file SEO:', error.message);
}