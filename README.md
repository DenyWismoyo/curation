# 🚀 Smart Curation & Assessment Platform

Sebuah platform web *full-stack* yang dirancang untuk mengelola asesmen dinamis, alur kurasi multi-peran, dan analisis data otomatis menggunakan Kecerdasan Buatan (AI). Dibangun menggunakan ekosistem modern **Next.js** dan **Firebase**, aplikasi ini memfasilitasi pembuatan formulir kustom, *generate* dokumen PDF secara langsung, dan integrasi AI untuk menghasilkan *blueprint* evaluasi yang presisi.

![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)

---

## ✨ Fitur Utama

- 🔐 **Role-Based Access Control (RBAC):** Otentikasi dan dasbor terpisah untuk tiga peran utama: **Admin**, **Curator**, dan **Public User**.
- 🛠️ **Dynamic Template Builder:** Admin dapat membangun formulir asesmen secara dinamis (Tab Form Builder) dan mengonfigurasi parameter AI (Tab AI Config) langsung dari antarmuka.
- 🤖 **AI-Powered Evaluation:** Integrasi layanan AI untuk menganalisis hasil asesmen pengguna dan menghasilkan *AI Prompt Blueprint* serta rekomendasi cerdas.
- 📄 **Universal PDF Export:** Menghasilkan dokumen PDF berkualitas tinggi (*Universal Assessment View* & *Report Template*) secara *real-time* menggunakan *React PDF*.
- 📊 **Vector & Email Services:** Layanan *backend* pendukung untuk pencarian berbasis vektor dan otomatisasi notifikasi email.

---

## 🏗️ Arsitektur Sistem

Aplikasi ini menggunakan pendekatan modular di mana *frontend* dan *backend* terintegrasi secara mulus melalui Firebase Services.

```mermaid
graph TD
    subgraph Frontend ["Frontend (Next.js App Router)"]
        UI["UI Components<br/>(Tailwind + Shadcn)"]
        Context["Contexts & Hooks<br/>(AuthContext, useCuration)"]
        Pages["Role-based Pages<br/>(Admin, Curator, Public)"]
    end

    subgraph Backend ["Firebase Backend"]
        Auth["Firebase Authentication"]
        Firestore[("Cloud Firestore<br/>(Rules & Indexes)")]
        Functions["Cloud Functions<br/>(Node.js)"]
    end

    subgraph Core_Services ["Core Microservices"]
        AI["AI Service<br/>(Prompt Templates)"]
        PDF["PDF Generator<br/>(React PDF)"]
        Vector["Vector Service"]
        Email["Email Service"]
    end

    %% Connections
    UI --> Context
    Context --> Pages
    
    Pages -->|Login/Session| Auth
    Pages -->|Read/Write Data| Firestore
    Pages -->|Trigger Actions| Functions

    Functions --> AI
    Functions --> Vector
    Functions --> Email
    Functions --> PDF
