# 🚀 Smart Curation & Assessment Platform (Enterprise Edition)

Platform *web* cerdas berskala *enterprise* yang dirancang untuk mendigitalisasi, mengotomatisasi, dan mengakselerasi alur kerja asesmen serta kurasi data. Didukung oleh integrasi Kecerdasan Buatan (AI) terpusat dan arsitektur *serverless* dari Firebase, sistem ini mengeliminasi inefisiensi birokrasi melalui pembuatan formulir dinamis, evaluasi otomatis, dan ekstraksi dokumen PDF secara *real-time*.

![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Enterprise Ready](https://img.shields.io/badge/Enterprise-Ready-00C853?style=for-the-badge)

---

## 📈 Business Value & Target Use Cases

Sistem ini dirancang sangat fleksibel dan dapat diadaptasi untuk berbagai kebutuhan industri dan sektor publik:

1. 🏛️ **Tata Kelola "Smart Hub" & Administrasi Publik:** Berfungsi sebagai modul inti dalam ekosistem digital pemerintah daerah untuk mengevaluasi kelayakan program masyarakat, mendata unit perlindungan komunitas, hingga manajemen perizinan secara transparan.
2. 🤝 **Kolaborasi Model Pentahelix:** Platform ideal untuk memfasilitasi, mengkurasi, dan menilai proposal inovasi silang sektor yang melibatkan pemerintah, akademisi, badan usaha, komunitas, dan media secara terpusat.
3. 🏢 **Corporate HR & Talent Acquisition:** Memungkinkan perusahaan melakukan asesmen kompetensi karyawan atau kandidat secara dinamis, dilengkapi dengan rekomendasi profil berbasis AI.
4. 🎓 **EdTech & Sertifikasi:** Mengotomatisasi ujian, penilaian akreditasi, dan penerbitan laporan kelulusan.

---

## ✨ Fitur Komersial Unggulan

1. 🧩 **Dynamic Wizard & Adaptive Tracks:** Pengguna dapat memilih jalur (*track*) yang relevan dan sistem akan menyajikan formulir yang beradaptasi secara dinamis sesuai kebutuhan asesmen.
2. 🤖 **AI-Powered Decision Support:** Sistem secara otonom menganalisis parameter input menggunakan AI (*Generative AI Service*) untuk merumuskan *AI Prompt Blueprint* dan memberikan rekomendasi objektif kepada tim kurator.
3. 📄 **High-Fidelity PDF Generation:** Pembuatan *Universal Assessment View* dan *Report Template* berformat PDF dengan standar profesional langsung dari antarmuka aplikasi.
4. 🔐 **Enterprise-Grade RBAC:** Dasbor terisolasi untuk peran **Admin**, **Curator**, dan **Public User** guna memastikan alur kerja yang terstruktur dan terukur.
5. 🛠️ **No-Code Template Builder:** Admin dapat membuat atau memodifikasi formulir asesmen baru (*Tab Form Builder*) serta mengkalibrasi instruksi AI (*Tab AI Config*) tanpa memerlukan *deployment* ulang.

---

## 🛡️ Keamanan & Kepatuhan (Security & Compliance)

Sebagai produk komersial, keamanan data adalah prioritas utama:
1. **Data Isolation:** Implementasi ketat *Firestore Security Rules* (`firestore.rules`) menjamin bahwa setiap lapisan peran hanya dapat mengakses dan memodifikasi data yang menjadi wewenangnya.
2. **API Security:** Kredensial AI dan logika pemrosesan data berat diamankan secara penuh di lapisan *backend* (Firebase Cloud Functions) untuk mencegah kebocoran *prompt* atau API Key.
3. **Privacy-First AI:** Data dikelola secara selektif sebelum dikirim ke layanan AI untuk menjaga kerahasiaan informasi sensitif institusi.

---

## 🏗️ Arsitektur Sistem Skala Besar

Dibangun dengan arsitektur *serverless* modern untuk menjamin skalabilitas (*auto-scaling*) saat terjadi lonjakan trafik pengguna dan menekan biaya pemeliharaan *server* konvensional.

```mermaid
graph TD
    subgraph Frontend ["Frontend (Next.js App Router)"]
        UI["UI Components<br/>(Tailwind + Shadcn UI)"]
        Context["Contexts & Hooks<br/>(AuthContext, useCuration, usePDFExport)"]
        Pages["Role-based Dashboards<br/>(Admin, Curator, Public)"]
    end

    subgraph Backend ["Firebase Serverless Backend"]
        Auth["Authentication & Identity"]
        Firestore[("Cloud Firestore<br/>(Rules & Indexes)")]
        Functions["Cloud Functions<br/>(Node.js Microservices)"]
    end

    subgraph Core_Services ["Microservices Integration"]
        AI["AI Analysis Service<br/>(Prompt Engine)"]
        PDF["PDF Generator<br/>(React PDF)"]
        Email["Automated Email Service"]
    end

    %% Connections
    UI --> Context
    Context --> Pages
    
    Pages -->|Secure Login| Auth
    Pages -->|Read/Write Data| Firestore
    Pages -->|Trigger Actions| Functions

    Functions --> AI
    Functions --> Email
    Functions --> PDF
