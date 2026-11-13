# Changelog — RAVE Desktop (Windows & macOS)

Format: [Keep a Changelog](https://keepachangelog.com/id/1.1.0/) · Versi: [SemVer](https://semver.org/lang/id/).
Satu sumber versi: `package.json` → `node scripts/bump-version.mjs patch|minor|major` menyinkronkan
`src-tauri/tauri.conf.json` & `src-tauri/Cargo.toml`. Tag git `desktop-vX.Y.Z`. Kompatibel dengan API gateway RAVE `/v1`.

## [0.2.2] - 2026-11-13

### Ditambahkan
- **Jelajahi semua** di Cari kini memakai kategori server yang sama dengan web (`GET /v1/catalog/browse`: warna,
  gambar, urutan). Tile genre membuka halaman kategori baru (`/v1/catalog/browse/:id` + playlist editorial bertag),
  Podcast / Cerita & Fiksi Audio membuka daftar acara (`/v1/catalog/shows?kind=`), Event Live dibuka di web RAVE.
  Tile podcast disembunyikan bila modul podcast dimatikan (`/v1/platform/config`).
- **Live** (setara web `/app/live`): menu Live dengan titik merah saat ada siaran, halaman daftar (sedang live,
  akan datang, sebelumnya; diperbarui otomatis), halaman tonton dengan pemutar HLS bertoken (hls.js, token
  diperbarui sebelum kedaluwarsa, menunggu otomatis saat siaran belum mulai/terputus), heartbeat penonton,
  chat live (polling, slowmode), gerbang masuk/tiket/hitung mundur/selesai. Musik dijeda saat live berbunyi.
  Rak **Sedang live** di Beranda.

### Diubah
- **Satu pintu Masuk/Daftar.** IAM RAVE hanya OTP email, jadi masuk dan daftar adalah alur yang sama: tombol
  ganda "Masuk" + "Daftar gratis" (bilah atas, sidebar, Pengaturan, ajakan tamu) diganti satu tombol
  **Masuk / Daftar**; modal tunggal "Masuk atau daftar" menjelaskan bahwa akun baru dibuat otomatis.
- Rapi & konsisten: satu tombol primer per layar (CTA tamu utama di bilah atas, sisanya sekunder), menu
  sidebar tetap menyala di halaman turunan (genre/podcast → Cari, tonton live → Live), tombol sekunder punya
  hover & status nonaktif, label ikon/tooltip yang sebelumnya tertulis keras kini ikut bahasa.

## [0.2.1] - 2026-11-13

### Ditambahkan
- Beranda setara web dengan data demo: **Diputar baru-baru ini** (`/v1/library/history`), **Playlist pilihan RAVE**
  (`/v1/library/playlists/featured`), **Event di kotamu** (`/v1/ticketing/events`, tiket dibuka di web), feed per kota.
- Banner koneksi: memeriksa server saat start, saat server diganti, dan saat jendela kembali fokus; coba ulang
  otomatis (5→60 dtk) dan tawarkan server lain dari preset. Tanpa polling selama server sehat.
- Pilihan cepat server di Pengaturan (`VITE_RAVE_API_PRESETS="Nama|URL,…"`).

### Diubah
- Default server build lokal → server demo `http://127.0.0.1:8080` (`./rave demo`); build rilis wajib mengisi
  `VITE_RAVE_API`. Pengaturan lama yang masih menunjuk `127.0.0.1:8088` (produksi lokal, tertutup CORS) dimigrasi.
- Ganti server lewat satu jalur aman (`switchServer`): keluar, hentikan pemutar, bersihkan cache.

## [0.2.0] - 2026-11-13

### Ditambahkan
- Mode tamu (langsung ke pemutar, pratinjau 30 dtk), modal Masuk/Daftar, splash pembuka.
- Onboarding selera setelah masuk (kota → genre → min. 3 artis, `/v1/me/onboarding`).
- Privasi & data (UU PDP): persetujuan per tujuan, hapus akun, tautan Kebijakan Privasi & Ketentuan.
- Label iklan internal "Dari RAVE"; ajakan paket Premium; penjelasan semua batas kualitas.
- Event putar disimpan permanen (royalti tidak hilang saat aplikasi ditutup); header `X-App-Version`.
- Versioning: satu sumber versi + skrip bump + CHANGELOG.

### Diubah
- Bahasa Indonesia sebagai default; bahasa yang dipilih disimpan ke akun.

## [0.1.0] - 2026-11-13

### Ditambahkan
- Rilis awal: Beranda, Cari, Pustaka, Album, Artis, Playlist, Disukai, Podcast, Pengaturan; pemutar dengan antrean,
  lirik tersinkron, laporan putar royalti, iklan tier Gratis; tombol media global & MediaSession; installer NSIS/MSI.
