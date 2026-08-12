import React from "react";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { GlassPanel } from "@omnifit-ui/components";

export default function CryptoDisclaimer() {
  return (
    <GlassPanel intensity="light" className="border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 p-5 md:p-6 my-8 rounded-2xl">
      <div className="flex items-start gap-4">
        <div className="p-2.5 bg-amber-100 dark:bg-amber-900/50 rounded-xl shrink-0 border border-amber-200 dark:border-amber-800/50 shadow-sm">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h4 className="font-bold text-amber-900 dark:text-amber-100 mb-2 tracking-tight">Penafian (Disclaimer)</h4>
          <p className="text-sm text-amber-800/80 dark:text-amber-200/70 leading-relaxed">
            Semua informasi, data, dan analisis yang disediakan oleh Omnifit AI bersifat informasional dan edukatif semata. Kami <strong className="text-amber-900 dark:text-amber-400">bukan penasihat keuangan</strong>. Keputusan perdagangan atau investasi kripto melibatkan risiko tinggi dan dapat mengakibatkan kerugian modal secara penuh. Anda bertanggung jawab penuh atas segala risiko dan keputusan investasi yang Anda buat. Harap baca secara saksama <Link href="/legal/tos" className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium">Syarat & Ketentuan</Link> dan <Link href="/legal/privacy" className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium">Kebijakan Privasi</Link> kami sebelum menggunakan platform ini.
          </p>
        </div>
      </div>
    </GlassPanel>
  );
}
