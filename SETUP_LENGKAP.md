# Setup Lengkap FinanceFlow MongoDB

Ikuti urutan ini dari awal sampai akhir.

---

## 1. Upload Project ke GitHub

1. Extract ZIP.
2. Buat repository GitHub baru.
3. Upload semua file project ini ke repository.
4. Repo boleh private.

---

## 2. Deploy Backend ke Vercel

1. Buka https://vercel.com
2. Login pakai GitHub.
3. Klik **Add New Project**.
4. Pilih repository project ini.
5. Pada bagian **Root Directory**, pilih:

```txt
backend
```

6. Buka bagian **Environment Variables**.
7. Isi dari file:

```txt
backend/VERCEL_ENV_COPY.txt
```

Isi environment variable satu per satu:

```txt
MONGODB_URI
MONGODB_DB
JWT_SECRET
CLIENT_ORIGIN
```

8. Klik **Deploy**.
9. Setelah deploy berhasil, salin URL Vercel backend, contoh:

```txt
https://financeflow-backend.vercel.app
```

10. Test backend dengan membuka:

```txt
https://financeflow-backend.vercel.app/api/health
```

Kalau berhasil, tampil JSON seperti:

```json
{
  "ok": true,
  "app": "FinanceFlow API"
}
```

---

## 3. Isi URL Backend di Frontend

Buka file:

```txt
config.js
```

Ganti:

```js
window.FINANCEFLOW_API_URL = '';
```

Menjadi URL backend kamu:

```js
window.FINANCEFLOW_API_URL = 'https://financeflow-backend.vercel.app';
```

Simpan, lalu push/update ke GitHub.

Kalau belum diisi di `config.js`, nanti masih bisa diisi manual dari halaman login.

---

## 4. Aktifkan GitHub Pages

1. Buka repository GitHub.
2. Masuk **Settings**.
3. Pilih **Pages**.
4. Pada **Build and deployment**, pilih:

```txt
Deploy from a branch
```

5. Branch:

```txt
main
```

6. Folder:

```txt
/root
```

7. Klik **Save**.
8. Tunggu sampai GitHub Pages aktif.

---

## 5. Login Aplikasi

Buka URL GitHub Pages kamu, lalu login:

```txt
eka / eka123
```

atau:

```txt
tes / tes123
```

Data akun akan tersimpan di MongoDB Atlas.

---

## 6. Cek Data di MongoDB Atlas

1. Buka MongoDB Atlas.
2. Masuk ke cluster.
3. Klik **Browse Collections** atau **Data Explorer**.
4. Cari database:

```txt
financeflow
```

5. Di dalamnya ada collection:

```txt
users_data
activity_logs
```

Data `eka` dan `tes` akan muncul sebagai document berbeda di `users_data`.
