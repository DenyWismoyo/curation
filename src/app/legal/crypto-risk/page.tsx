import React from 'react';

export const metadata = {
  title: 'Pernyataan Risiko Kripto | Omnifit',
  description: 'Pernyataan risiko terkait investasi dan perdagangan aset kripto.',
};

export default function CryptoRiskDisclosurePage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 py-12 px-4 sm:px-6 lg:px-8 font-sans selection:bg-indigo-500/30">
      <div className="max-w-3xl mx-auto bg-white p-8 sm:p-12 rounded-[2rem] shadow-xl ring-1 ring-slate-100">
        <h1 className="text-3xl sm:text-4xl font-black mb-2 text-indigo-600 tracking-tight">Pernyataan Risiko Kripto</h1>
        <p className="text-sm text-slate-500 font-medium mb-8">Pembaruan Terakhir: {new Date().toLocaleDateString('id-ID')}</p>

        <div className="prose prose-slate max-w-none">
          <p className="lead font-medium text-slate-700">
            Perdagangan dan investasi aset kripto (cryptocurrency) melibatkan risiko yang sangat tinggi dan mungkin tidak cocok untuk semua jenis investor. 
            Nilai aset kripto sangat fluktuatif dan dapat berubah secara drastis dalam waktu singkat.
          </p>

          <h2 className="text-xl font-bold mt-8 mb-4 text-slate-900">1. Risiko Volatilitas Harga</h2>
          <p>
            Harga aset kripto tidak dijamin oleh entitas mana pun dan sepenuhnya ditentukan oleh kekuatan pasar. Harga dapat mengalami fluktuasi yang ekstrem dalam satu hari, yang berarti Anda bisa kehilangan seluruh modal investasi Anda.
          </p>

          <h2 className="text-xl font-bold mt-8 mb-4 text-slate-900">2. Risiko Regulasi</h2>
          <p>
            Peraturan terkait aset kripto di berbagai yurisdiksi, termasuk di Indonesia (Bappebti/OJK), dapat berubah sewaktu-waktu. Perubahan regulasi ini dapat berdampak negatif secara material terhadap nilai aset atau kelangsungan platform.
          </p>

          <h2 className="text-xl font-bold mt-8 mb-4 text-slate-900">3. Sifat Informasi</h2>
          <p>
            Omnifit Crypto Insight menyediakan analisis, pelacakan data pasar (seperti Smart Money Tracking), dan asisten AI berdasarkan data publik. Semua informasi yang disajikan di platform ini <strong>bukanlah saran investasi (Not Financial Advice)</strong>. Anda sepenuhnya bertanggung jawab atas keputusan perdagangan Anda sendiri.
          </p>

          <h2 className="text-xl font-bold mt-8 mb-4 text-slate-900">4. Risiko Teknologi</h2>
          <p>
            Aset kripto bergantung pada teknologi blockchain dan jaringan terdesentralisasi yang rentan terhadap serangan siber, peretasan, pencurian kunci privat, dan kegagalan sistem.
          </p>

          <div className="mt-10 p-5 bg-rose-50 border border-rose-200 rounded-xl">
            <p className="text-sm font-bold text-rose-700 mb-0">
              Dengan mengakses dan menggunakan fitur Crypto Insight di Omnifit, Anda secara tegas menyatakan bahwa Anda telah membaca, memahami, dan menyetujui pernyataan risiko ini. Anda menyetujui bahwa Omnifit tidak bertanggung jawab atas kerugian finansial apa pun yang mungkin Anda alami.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
