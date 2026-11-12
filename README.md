# RAVE Desktop

Aplikasi dengar RAVE untuk **Windows** dan **macOS**, dibangun dengan [Tauri v2](https://v2.tauri.app/) + React.
Tata letak ala pemutar musik desktop (navigasi kiri, konten, panel "sedang diputar", bilah pemutar bawah) dengan
gaya khas RAVE: kanvas gelap, mustard sebagai primer, judul poster Staatliches, label Space Mono, sudut tegas,
bayangan sablon, tekstur grain.

Proyek ini **klien** untuk platform RAVE (`../Development`, gateway `/v1`) — tidak ada logika bisnis di sini.

## Fitur (v0.1)

| Area | Isi |
|---|---|
| Akun | Masuk OTP email (IAM RAVE hanya OTP), refresh token berotasi, keluar mencabut sesi di server |
| Dengar | Beranda (quick picks + rak), Cari (langsung saat mengetik), Album, Artis, Playlist, Lagu yang Disukai, Pustaka (playlist/artis/album), Podcast & episode |
| Pemutar | Antrean, acak, ulangi, seek, volume, pemulihan stream otomatis, pratinjau 30 dtk, kualitas mengikuti hak Premium, laporan putar untuk royalti (start/progress/complete/skip, antre ulang saat offline), jeda iklan tier Gratis |
| Panel kanan | Sedang diputar · Antrean · **Lirik tersinkron** (klik baris untuk lompat) |
| Native | Satu instance, ukuran & posisi jendela diingat, **tombol media keyboard global**, kontrol media OS (MediaSession), judul jendela = lagu, tautan eksternal dibuka di browser |
| UX | Maju/mundur riwayat, pintasan keyboard, responsif (sidebar ciut < 1100 px, panel menimpa < 1280 px), bahasa Indonesia/Inggris, aksesibel (fokus terlihat, label ARIA, `prefers-reduced-motion`) |

**Ringan:** bundel JS ±97 KB gzip (React + seluruh aplikasi), CSS ±9 KB, 52 paket npm, tanpa react-query/router
(cache SWR & router mungil sendiri), font dibundel lokal (tampil benar saat offline). Profil rilis Rust: LTO, `opt-level = "s"`, strip.

### Pintasan

| Tombol | Aksi |
|---|---|
| Spasi | Putar / jeda |
| Ctrl/⌘ + → / ← | Lagu berikutnya / sebelumnya |
| Ctrl/⌘ + ↑ / ↓ | Volume |
| Ctrl/⌘ + K | Cari |
| Alt + ← / → | Kembali / maju |
| Tombol media keyboard | Putar/jeda, berikutnya, sebelumnya (global) |

## Struktur

```
src/
  main.tsx, App.tsx        kerangka: sidebar · konten · panel kanan · bilah pemutar, pintasan, integrasi media
  lib/                     api (gateway + refresh token), query (cache SWR), i18n, fmt, native (Tauri), session
  stores/                  auth, settings, nav (riwayat), player, ads, likes, toast — zustand
  components/              Sidebar, TopBar, PlayerBar, RightPanel, AdBreak, Hero, media (kartu/rak/daftar lagu), ui
  views/                   Home, Search, Library, Album, Artist, Playlist (+Disukai), Show, Settings, Login
src-tauri/
  src/lib.rs               plugin: single-instance, window-state, opener, global-shortcut
  tauri.conf.json          jendela, CSP, bundle (NSIS/MSI, DMG/.app)
  capabilities/            izin minimum jendela utama
.github/workflows/build.yml  build installer Windows + macOS (Apple Silicon & Intel)
```

## Menjalankan

Prasyarat umum: **Node.js 20+**.

### Mode browser (cepat, untuk UI)

```bash
npm install
VITE_RAVE_API=http://127.0.0.1:8080 npm run dev     # buka http://localhost:1420
```

Fitur native (tombol media global, satu instance) tidak aktif di mode ini; semuanya aman diabaikan.

### Aplikasi desktop

**Windows 10/11**

1. [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) → centang *Desktop development with C++*.
2. WebView2 (sudah ada di Windows 11 / Edge terbaru).
3. Rust: `winget install Rustlang.Rustup` lalu `rustup default stable-msvc`.

**macOS 11+**

1. `xcode-select --install`
2. Rust: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`

Lalu:

```bash
npm install
npm run app:dev       # jendela desktop dengan hot reload
npm run app:build     # installer: src-tauri/target/release/bundle/{nsis,msi} atau {dmg,macos}
```

> Build harus dijalankan di OS tujuan (Windows → .exe/.msi, macOS → .dmg). Untuk keduanya sekaligus, gunakan
> workflow GitHub Actions (`.github/workflows/build.yml`): push tag `v0.1.0` atau jalankan manual dari tab Actions.

### Server

Default server diambil dari `VITE_RAVE_API` saat build (lihat `.env.example`), lalu dapat diganti pengguna di
**Pengaturan → Server RAVE** (atau di layar masuk). Gateway RAVE harus mengizinkan origin aplikasi desktop di CORS:

```
CORS_ORIGINS=https://rave.id,tauri://localhost,http://tauri.localhost,https://tauri.localhost
```

(`tauri://localhost` = macOS, `http://tauri.localhost` = Windows.) Di mode dev gateway mengizinkan semua origin.

## Distribusi & penandatanganan

- **Windows:** tanpa sertifikat, SmartScreen menampilkan peringatan "unrecognized app". Gunakan sertifikat code
  signing (OV/EV) — lihat [Tauri: Windows code signing](https://v2.tauri.app/distribute/sign/windows/).
- **macOS:** tanpa Developer ID + notarisasi, Gatekeeper memblokir aplikasi. Isi secret `APPLE_*` di repo untuk
  workflow — lihat [Tauri: macOS code signing](https://v2.tauri.app/distribute/sign/macos/).
- Ikon dibuat dari `src-tauri/app-icon.png` (logo RAVE 1024 px): `npm run icons`.

## Belum termasuk (rencana)

- Auto-update (Tauri updater + kunci tanda tangan), ikon tray & mini-player, unduhan offline Premium (menunggu
  keputusan DRM), deep link `rave://`, penyimpanan token di keychain OS, membuat/mengubah playlist, tonton Live (HLS),
  tiket & dompet e-ticket. Artist Studio, Promotor Hub, dan Back Office tetap di web.
