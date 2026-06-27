# FinanceFlow - GitHub Pages + Vercel + MongoDB Atlas

Aplikasi web pencatat keuangan modern dengan login, budget, kategori, pengeluaran, CRUD, chart, dan format Rupiah.

## Login Default

```txt
eka / eka123
tes / tes123
```

Data akun `eka` dan `tes` dipisah otomatis di MongoDB berdasarkan token login. Frontend tidak bisa menyimpan data akun lain.

## Struktur Project

```txt
finance-tracker-mongodb-siap/
├── index.html
├── style.css
├── app.js
├── config.js
├── backend/
│   ├── api/index.js
│   ├── package.json
│   ├── vercel.json
│   ├── .env.example
│   └── VERCEL_ENV_COPY.txt
├── SETUP_LENGKAP.md
├── MONGODB_CHECKLIST.md
└── .gitignore
```

## Cara Kerja

```txt
GitHub Pages  -> frontend HTML/CSS/JS
Vercel        -> backend API Node.js
MongoDB Atlas -> database online
```

GitHub Pages tidak bisa langsung menyimpan data ke MongoDB dengan aman. Karena itu, MongoDB connection string hanya dipakai di backend Vercel.

## Fitur

- Login akun `eka` dan `tes`
- Data akun terpisah
- Budget bulanan
- Budget terpakai
- Sisa budget
- CRUD kategori
- CRUD pengeluaran
- Chart pengeluaran per kategori
- Chart pengeluaran per bulan
- Export/import JSON
- Format Rupiah otomatis
- Data online di MongoDB Atlas

## Penting

Connection string MongoDB sudah saya siapkan di file:

```txt
backend/.env.example
backend/VERCEL_ENV_COPY.txt
```

Untuk deploy Vercel, isi Environment Variables dari file `backend/VERCEL_ENV_COPY.txt`.

Kalau repo suatu hari dibuat public, segera ganti password database MongoDB Atlas.


## Update Tampilan Login Biasa

Versi ini sudah dirapikan supaya pengguna cukup memasukkan **username** dan **password**, tanpa memilih akun dan tanpa melihat URL teknis.

Perubahan utama:

- Tidak ada lagi tombol pilih akun **Eka/Tes**.
- Pengguna cukup mengisi username dan password seperti login biasa.
- Field URL backend dipindah ke bagian tersembunyi **Khusus admin: pengaturan server**.
- Kalau URL backend sudah diisi di `config.js`, pengguna tidak perlu membuka pengaturan server sama sekali.
- Tampilan hero tetap modern, tetapi bahasa dibuat lebih mudah dipahami pengguna umum.

Agar halaman login benar-benar sederhana, isi file `config.js` dengan URL backend Vercel kamu:

```js
window.FINANCEFLOW_API_URL = 'https://nama-backend-kamu.vercel.app';
```

Setelah itu upload ulang ke GitHub Pages. Pengguna nanti hanya melihat form username dan password.


## Catatan update tampilan login

Halaman login sudah dibuat sederhana untuk pengguna biasa:

- Pengguna hanya melihat input username dan password.
- Tidak ada pilihan akun.
- Tidak ada field teknis seperti MongoDB, Vercel, atau Backend API URL di halaman login.
- URL backend diatur oleh admin melalui `config.js`.

Isi URL backend di file `config.js`:

```js
window.FINANCEFLOW_API_URL = 'https://nama-backend-kamu.vercel.app';
```
