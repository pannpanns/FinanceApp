# FinanceFlow - Vercel Full Fix

Versi ini memindahkan frontend dan API ke **satu deploy Vercel** agar tidak terkena masalah fetch/CORS dari GitHub Pages ke Vercel.

Source code tetap boleh disimpan di GitHub. Vercel mengambil source dari GitHub dan menjalankan:

- `index.html`, `style.css`, `app.js` sebagai tampilan web.
- `api/login.js`, `api/data.js`, `api/health.js` sebagai backend API.
- MongoDB Atlas sebagai database.

## Login default

- `eka / eka123`
- `tes / tes123`

## Cara deploy yang benar

1. Upload semua file dalam folder ini ke root repository GitHub.
2. Buka Vercel project.
3. Masuk **Settings > Build and Deployment**.
4. Ubah **Root Directory** menjadi root project, bukan `backend`.
   - Pilih `FinanceApp (root)` atau kosongkan Root Directory.
   - Jangan pilih `backend` lagi.
5. Pastikan Environment Variables masih ada:
   - `MONGODB_URI`
   - `MONGODB_DB`
   - `JWT_SECRET`
   - `CLIENT_ORIGIN`
6. Redeploy.
7. Buka URL Vercel utama, contoh:
   - `https://finance-app-vann2.vercel.app`

## Test API

Buka:

```txt
https://finance-app-vann2.vercel.app/api/health
```

Harus muncul:

```json
{
  "ok": true,
  "app": "FinanceFlow API"
}
```

## Catatan penting

Dengan versi ini, pakai URL Vercel sebagai URL aplikasi utama. GitHub tetap dipakai sebagai tempat source code, tapi aplikasi dibuka dari Vercel supaya frontend dan backend satu domain.
