# SOP Operasional CMS (Bulanan + Uji Lokal Aman)

Dokumen ini untuk admin non-teknis agar pengelolaan konten aman dan konsisten.

## A. SOP Bulanan Publish (Produksi)

Tujuan: perubahan tidak langsung live, publish dilakukan saat akhir bulan.

Prasyarat:
- Mode publish di Decap: `simple` (aktif saat ini di `admin/config.yml`)
- Admin sudah bisa login ke `/admin/`

Langkah rutin selama bulan berjalan:
1. Buka `/admin/`.
2. Edit konten yang diperlukan:
   - Kategori portofolio (cover, nama, filter kategori)
   - Produk portofolio (gambar, judul, harga, filter)
   - Koleksi musiman (hero, produk, jadwal)
3. Simpan perubahan yang sudah final (klik **Save**).
4. Ulangi hanya untuk item yang benar-benar siap.
5. Jangan jalankan deploy ke live sampai tanggal rilis bulanan.

Langkah akhir bulan (hari rilis):
1. Review semua perubahan yang sudah tersimpan.
2. Pastikan:
   - gambar benar
   - judul benar
   - harga angka benar (tanpa ketik Rp)
   - filter produk sudah dipilih
3. Jalankan deploy/publish website.
4. Cek website live setelah deploy.

Catatan:
- Decap tidak punya scheduler bulanan built-in yang stabil tanpa workflow tambahan.
- Model aman: simpan perubahan final, deploy manual di akhir bulan.

## B. SOP Uji CMS Lokal (Aman, Sebelum Push)

Tujuan: uji alur admin di localhost tanpa menyentuh website live.

Status setup saat ini:
- `admin/config.yml` sudah diarahkan ke local backend `http://127.0.0.1:8081/api/v1`.
- Backend produksi masih `git-gateway` (normal untuk live).
- Untuk uji lokal Decap yang aman, wajib jalankan **local backend proxy** (`decap-server`).
- Catatan penting: mode `simple` paling stabil untuk local backend Decap.

### 1) Prasyarat teknis

Wajib ada di mesin lokal:
- `node`
- `npm` atau `npx`
- `git`

Jika `node/npm/npx` belum ada, local Decap proxy belum bisa jalan.

### 2) Jalankan uji lokal

Cara cepat (direkomendasikan):

1. Jalankan:
   - `./start-local-cms-test.sh`
2. Buka:
   - `http://127.0.0.1:5500/admin/`
3. Lakukan edit percobaan, simpan, verifikasi file konten lokal berubah.

Cara manual:

1. Jalankan web server lokal Anda (contoh Live Server) di localhost/127.0.0.1.
2. Di terminal terpisah, jalankan proxy Decap:
   - `npx --yes decap-server --port 8081`
3. Buka:
   - `http://127.0.0.1:<port>/admin/`

### 3) Kenapa ini aman

- Saat proxy lokal aktif, Decap menulis ke repo lokal Anda.
- Tidak perlu login Netlify/GitHub untuk alur local backend.
- Perubahan masih lokal sampai Anda sendiri commit + push.

### 4) Larangan saat uji lokal

- Jangan publish/merge ke remote kalau perubahan masih percobaan.
- Jangan uji tanpa proxy lokal aktif.

### 5) Jika local test gagal

Cek berurutan:
1. Proxy `npx decap-server` benar-benar running.
   - jika command terlihat diam, gunakan `npx --yes decap-server --port 8081`
   - jika muncul `ENOTFOUND registry.npmjs.org`, berarti masalahnya ada di koneksi npm registry / DNS / proxy jaringan
2. URL admin dibuka sebagai `localhost` / `127.0.0.1`.
3. `admin/config.yml` masih mengarah ke `http://127.0.0.1:8081/api/v1`.
4. Pastikan `publish_mode` tetap `simple` saat uji lokal.
5. Browser console error (script CDN Decap/Identity gagal load karena internet/firewall).

## C. Checklist Cepat Admin (Non-teknis)

Sebelum simpan:
1. Upload gambar.
2. Isi judul produk.
3. Isi harga angka saja (contoh `15000`).
4. Pilih filter.

Sebelum publish akhir bulan:
1. Semua draft sudah dicek.
2. Tidak ada typo judul/harga.
3. Cover kategori sudah benar.
4. Hero koleksi musiman sudah benar.
