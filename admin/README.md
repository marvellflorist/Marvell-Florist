# Panduan Admin Decap (Marvell Florist)

Proyek ini memakai **Decap CMS + Netlify Identity + Git Gateway**.

## 1) Jika `/admin` atau login muncul "not found"

Periksa hal berikut di Netlify (site yang live):

1. `Identity` -> **Enable Identity**
2. `Identity` -> `Registration` -> **Invite only**
3. `Identity` -> `Services` -> **Enable Git Gateway**
4. `Identity` -> `External providers` -> **Enable GitHub** (jika login via GitHub)
5. `Identity` -> `Invite users` -> undang semua admin
6. Deploy terbaru harus sudah aktif (agar `admin/index.html`, `admin/config.yml`, dan `netlify.toml` terbaru ikut live)

Akses admin yang benar:

- `https://<domain-anda>/admin/`

Catatan teknis di repo:

- `netlify.toml` hanya perlu menjaga redirect `/admin -> /admin/`.
- Jangan pakai rewrite fallback `/admin/* -> /admin/index.html` di Netlify untuk setup ini, karena bisa memicu loop redirect pada admin live.

## 2) Struktur konten yang dikelola admin

- Kategori portofolio: `content/portfolio-categories.json`
  - nama kategori
  - cover kategori
  - nomor WhatsApp
  - alias/mapping lama
  - struktur filter kategori
- Produk portofolio: `content/gallery.json`
  - disusun per kategori (lebih mudah untuk katalog besar)
  - urutan input produk: **gambar -> nama/judul -> harga -> filter**
- Koleksi musiman: `content/featured.json`
  - judul koleksi
  - hero image
  - produk musiman
  - jadwal aktif (`start`, `end`, `priority`, `forceActive`)
  - teks promo strip (`promoText`)

## 3) Workflow publish bulanan (yang realistis di Decap)

Konfigurasi saat ini memakai `publish_mode: simple`.

Artinya:

- perubahan langsung disimpan ke branch repo saat klik **Save**
- tidak ada status **Draft / In Review / Ready**
- publish ke website tetap mengikuti alur deploy (misalnya setelah merge/deploy)

Untuk kebutuhan "publish akhir bulan":

1. Selama bulan berjalan, simpan perubahan yang sudah final saja.
2. Di akhir bulan, review commit/perubahan yang sudah masuk.
3. Jalankan deploy pada hari rilis (manual atau lewat alur CI/CD Anda).

Batasan penting:

- Decap tidak punya scheduler bulanan built-in yang stabil tanpa workflow tambahan.
- Jadi model paling aman: **manual deploy/publish di akhir bulan**.

## SOP operasional

Lihat SOP lengkap di:

- `admin/SOP-OPERASIONAL-CMS.md`
- Script uji cepat lokal lintas platform: `npm run cms:test`

## Local admin yang stabil

Untuk admin lokal di `http://127.0.0.1:5500/admin/`:

1. Pastikan Node.js dan npm tersedia.
2. Jalankan `npm run cms:test` dari root project.
3. Buka URL admin yang muncul di terminal, biasanya `http://127.0.0.1:5500/admin/`.
4. Biarkan terminal itu tetap terbuka saat memakai CMS.

Jika tab admin dibuka lebih dulu, halaman sekarang akan menunggu proxy lokal beberapa detik dan lanjut otomatis saat backend sudah hidup.

Jika Anda sudah memakai Live Server atau static server lain untuk website lokal, jalankan proxy saja dengan `npm run cms:proxy`, lalu reload halaman admin.
