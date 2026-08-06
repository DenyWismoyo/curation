import React from "react";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";

export default function CryptoDisclaimer() {
  return (
    <div className="bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/50 rounded-xl p-4 md:p-6 my-8">
      <div className="flex items-start gap-4">
        <div className="p-2 bg-amber-500/10 rounded-lg shrink-0">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
        </div>
        <div>
          <h4 className="font-bold text-slate-200 mb-2">Penafian (Disclaimer)</h4>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            Semua informasi, data, dan analisis yang disediakan oleh Omnifit AI bersifat informasional dan edukatif semata. Kami <strong>bukan penasihat keuangan</strong>. Keputusan perdagangan atau investasi kripto melibatkan risiko tinggi dan dapat mengakibatkan kerugian modal secara penuh. Anda bertanggung jawab penuh atas segala risiko dan keputusan investasi yang Anda buat. Harap baca secara saksama <Link href="/legal/tos" className="text-indigo-400 hover:underline">Syarat & Ketentuan</Link> dan <Link href="/legal/privacy" className="text-indigo-400 hover:underline">Kebijakan Privasi</Link> kami sebelum menggunakan platform ini.
          </p>
        </div>
      </div>
    </div>
  );
}
