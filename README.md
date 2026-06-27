# FinanceFlow MongoDB - No Preflight Fix

Versi ini memperbaiki login GitHub Pages ke Vercel dengan cara menghindari preflight CORS.

## Perubahan penting

- Frontend memakai endpoint `/api/login`, `/api/data`, dan `/api/health`.
- Request login/data dikirim sebagai `text/plain` agar tidak memicu preflight CORS.
- Token dikirim lewat query agar request dari GitHub Pages lebih stabil.
- Backend sudah bisa membaca token dari query atau Authorization header.
- `config.js` sudah diisi:

```js
window.FINANCEFLOW_API_URL = 'https://finance-app-vann2.vercel.app';
```

## Cara update

1. Push semua file ini ke GitHub.
2. Pastikan Vercel Root Directory tetap `backend`.
3. Redeploy backend di Vercel.
4. Tunggu GitHub Pages update.
5. Buka halaman dengan `Ctrl + F5`.

## Login

- `eka / eka123`
- `tes / tes123`
