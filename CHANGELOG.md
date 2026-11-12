# Changelog — RAVE Desktop (Windows & macOS)

Format: [Keep a Changelog](https://keepachangelog.com/id/1.1.0/) · Versi: [SemVer](https://semver.org/lang/id/).
Satu sumber versi: `package.json` → `node scripts/bump-version.mjs patch|minor|major` menyinkronkan
`src-tauri/tauri.conf.json` & `src-tauri/Cargo.toml`. Tag git `desktop-vX.Y.Z`. Kompatibel dengan API gateway RAVE `/v1`.

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
