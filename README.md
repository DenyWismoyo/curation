# 🚀 Smart Curation & Assessment Platform

Sebuah platform web *full-stack* yang dirancang untuk mengelola asesmen dinamis, alur kurasi multi-peran, dan analisis data otomatis menggunakan Kecerdasan Buatan (AI). Dibangun menggunakan ekosistem modern **Next.js** dan **Firebase**, aplikasi ini memfasilitasi pembuatan formulir kustom, *generate* dokumen PDF secara langsung, dan integrasi AI untuk menghasilkan evaluasi yang presisi.

![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)

---

## ✨ Fitur Utama

*   🔐 **Role-Based Access Control (RBAC):** Otentikasi dan dasbor terpisah untuk peran **Admin**, **Curator**, dan **Public User**.
*   🛠️ **Dynamic Template Builder:** Admin dapat membangun formulir asesmen secara dinamis melalui antarmuka *Form Builder* dan mengonfigurasi parameter AI (*AI Config*).
*   🤖 **AI-Powered Evaluation:** Integrasi layanan AI untuk menganalisis hasil asesmen pengguna dan menghasilkan *AI Prompt Blueprint* secara otomatis.
*   📄 **Universal PDF Export:** Menghasilkan dokumen PDF berkualitas tinggi (*Universal Assessment View*, *Template Questions*, & *Report Template*) secara *real-time*.
*   🧩 **Dynamic Wizard & Tracks:** Pengguna publik dapat memilih jalur (*track*) asesmen dan mengisi formulir melalui sistem *Dynamic Wizard*.

---

## 🏗️ Arsitektur Sistem

Aplikasi ini menggunakan pendekatan modular di mana *frontend* dan *backend* terintegrasi secara mulus melalui layanan Firebase.

```mermaid
graph TD
    subgraph Frontend ["Frontend (Next.js App Router)"]
        UI["UI Components<br/>(Tailwind + Shadcn UI)"]
        Context["Contexts & Hooks<br/>(AuthContext, useCuration, usePDFExport)"]
        Pages["Role-based Pages<br/>(Admin, Curator, Assessment)"]
    end

    subgraph Backend ["Firebase Backend"]
        Auth["Firebase Authentication"]
        Firestore[("Cloud Firestore<br/>(Rules & Indexes)")]
        Functions["Cloud Functions<br/>(Node.js)"]
    end

    subgraph Core_Services ["Core Services"]
        AI["AI Service<br/>(Prompt Templates)"]
        PDF["PDF Generator<br/>(React PDF)"]
        Email["Email Service"]
    end

    %% Connections
    UI --> Context
    Context --> Pages
    
    Pages -->|Login/Session| Auth
    Pages -->|Read/Write Data| Firestore
    Pages -->|Trigger Actions| Functions

    Functions --> AI
    Functions --> Email
    Functions --> PDF
