# FinanceFlow MongoDB - Final CORS Fix

Versi ini memperbaiki masalah login dari GitHub Pages ke backend Vercel yang muncul sebagai `Failed to fetch` / tidak bisa terhubung ke server.

## Yang diubah

- Frontend sekarang memanggil endpoint root Vercel seperti `/login`, `/data`, dan `/health`.
- Backend tetap mendukung `/api/login`, `/api/data`, dan `/api/health`.
- Header CORS ditambahkan di `backend/vercel.json` dan di `backend/api/index.js`.
- URL backend sudah diisi di `config.js`:

```js
window.FINANCEFLOW_API_URL = 'https://finance-app-vann2.vercel.app';
```

## Cara update

1. Upload/push semua file ke GitHub.
2. Pastikan Vercel project tetap memakai Root Directory: `backend`.
3. Di Vercel, lakukan Redeploy.
4. Tunggu GitHub Pages selesai update.
5. Buka web lalu tekan `Ctrl + F5`.

## Login

- eka / eka123
- tes / tes123
