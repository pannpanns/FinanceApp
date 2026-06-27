# FinanceFlow - Web Catatan Keuangan

Web statis untuk mencatat keuangan pribadi. Cocok di-host di GitHub Pages karena tidak membutuhkan database.

## Login

- Username: `eka`
- Password: `eka123`

## Fitur

- Login sederhana
- Budget bulanan
- CRUD kategori
- CRUD pengeluaran
- Dashboard ringkasan
- Chart pengeluaran berdasarkan kategori
- Data tersimpan otomatis di `localStorage` browser
- Export dan import data JSON untuk backup
- Integrasi Google Spreadsheet melalui Google Apps Script Web App
- Responsive untuk laptop dan HP

## Struktur File

- `index.html` = halaman utama web
- `style.css` = styling modern dan responsive
- `app.js` = semua logic aplikasi, CRUD, localStorage, chart, dan sync Spreadsheet
- `google-apps-script.gs` = kode yang ditempel ke Google Apps Script
- `README.md` = panduan penggunaan

## Cara menjalankan di komputer

1. Buka folder project.
2. Klik dua kali file `index.html`.
3. Login menggunakan akun demo.

## Cara upload ke GitHub Pages

1. Buat repository baru di GitHub.
2. Upload semua file: `index.html`, `style.css`, `app.js`, `google-apps-script.gs`, dan `README.md`.
3. Buka menu repository: **Settings** → **Pages**.
4. Pada bagian **Build and deployment**, pilih branch `main` dan folder `/root`.
5. Klik **Save**.
6. Tunggu sampai link GitHub Pages aktif.

## Cara menghubungkan ke Google Spreadsheet

### 1. Buat Google Spreadsheet

Buat Google Spreadsheet kosong. Nama file bebas, misalnya `FinanceFlow Data`.

### 2. Buka Apps Script

Di Google Spreadsheet, klik:

**Extensions** → **Apps Script**

Hapus kode bawaan, lalu copy semua isi file:

`google-apps-script.gs`

Tempelkan ke Apps Script.

### 3. Samakan Secret Key

Di file `google-apps-script.gs`, default secret key adalah:

```js
const SECRET_KEY = 'eka-finance-secret';
```

Di web FinanceFlow, buka menu **Spreadsheet**, lalu isi Secret Key yang sama.

### 4. Deploy Apps Script sebagai Web App

Klik:

**Deploy** → **New deployment** → pilih **Web app**

Gunakan pengaturan berikut:

- Execute as: **Me**
- Who has access: **Anyone**

Klik **Deploy**, beri izin akses jika diminta, lalu copy URL Web App yang berakhiran `/exec`.

### 5. Tempel URL ke web FinanceFlow

Masuk ke web FinanceFlow → menu **Spreadsheet**.

Isi:

- URL Google Apps Script Web App
- Secret Key
- Centang **Aktifkan sinkronisasi otomatis**
- Klik **Simpan Pengaturan**

Setelah aktif, setiap tambah, update, atau hapus pengeluaran akan otomatis dikirim ke Google Spreadsheet.

## Sheet yang otomatis dibuat

Apps Script akan membuat 2 sheet:

1. `Pengeluaran`
   - Menyimpan data pengeluaran aktif.
   - Jika pengeluaran diedit, baris yang sama akan diperbarui.
   - Jika pengeluaran dihapus, statusnya menjadi `DELETED`.

2. `Log`
   - Menyimpan riwayat test koneksi dan proses sinkronisasi.

## Catatan penting

Karena ini web statis tanpa database, data tetap disimpan utama di browser pengguna melalui `localStorage`. Google Spreadsheet berfungsi sebagai backup/salinan otomatis.

- Data lokal tetap ada walaupun halaman ditutup atau refresh.
- Data lokal bisa hilang jika cache/browser data dihapus.
- Data Google Spreadsheet tetap tersimpan selama Apps Script dan Spreadsheet tidak dihapus.
- Gunakan fitur export/import JSON untuk backup tambahan.

## Catatan keamanan

Login pada project ini hanya login sederhana di sisi frontend. Username, password, dan secret key masih bisa dilihat dari source code. Untuk keamanan serius, gunakan backend, autentikasi server-side, dan database.
"# FinanceApp" 
