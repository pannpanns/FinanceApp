# Checklist MongoDB Atlas

Pastikan ini sudah benar agar backend bisa connect.

## 1. Database User

Kamu memakai connection string:

```txt
mongodb+srv://root:*****@cluster0.ymm5jbe.mongodb.net/?appName=Cluster0
```

Pastikan user `root` benar-benar ada di MongoDB Atlas:

```txt
Security > Database Access
```

Kalau belum ada, buat user `root` dan password sesuai yang kamu pakai.

## 2. Network Access

Buka:

```txt
Security > Network Access
```

Tambahkan IP Address:

```txt
0.0.0.0/0
```

Ini diperlukan agar Vercel bisa mengakses MongoDB Atlas.

## 3. Cluster Aktif

Pastikan cluster status aktif dan tidak paused.

## 4. Test Vercel

Setelah deploy backend, buka:

```txt
https://URL-BACKEND-KAMU.vercel.app/api/health
```

Jika berhasil, output harus ada:

```json
"ok": true
```

## 5. Jika Login Gagal

Cek Environment Variables di Vercel:

```txt
MONGODB_URI
MONGODB_DB
JWT_SECRET
CLIENT_ORIGIN
```

Setelah mengubah Environment Variables, lakukan **Redeploy**.
