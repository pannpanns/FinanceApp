# Penyebab Error Login Sebelumnya

Backend dan MongoDB sudah benar, karena URL Vercel menampilkan `ok: true`.

Error login tetap muncul karena frontend di GitHub Pages memanggil backend Vercel dari domain berbeda. Ini sering tersangkut di fetch/CORS/cache/route.

Fix permanen di versi ini:

- Frontend dan API dijalankan dalam satu domain Vercel.
- Tidak perlu GitHub Pages untuk membuka aplikasinya.
- GitHub tetap dipakai untuk menyimpan source code.

## Yang harus diganti di Vercel

Saat import/deploy, Root Directory jangan `backend`.

Pilih:

```txt
FinanceApp (root)
```

atau kosongkan Root Directory agar Vercel membaca root repository.

Kalau masih pilih `backend`, frontend tidak akan ikut dideploy dan error lama bisa muncul lagi.
