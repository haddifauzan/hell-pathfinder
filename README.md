# Infernal Pathfinding Game — AI Pathfinding & Pursuit Simulator

> **Tugas Besar Mata Kuliah Kecerdasan Buatan (Artificial Intelligence)**  
> **Program Studi Ilmu Komputer — Semester 3**  
> Implementasi, Visualisasi, dan Perbandingan Algoritma Pencarian Jalur 2D (*Pathfinding*) Berbasis Web: **Uniform-Cost Search (UCS)** vs **A* Search (Manhattan Heuristic)**.

---

## Daftar Isi
1. [Tentang Proyek](#tentang-proyek)
2. [Konsep & Mekanik Permainan](#konsep--mekanik-permainan)
3. [Algoritma Pencarian Jalur](#algoritma-pencarian-jalur)
   - [Uniform-Cost Search (UCS)](#1-uniform-cost-search-ucs--dijkstra)
   - [A* Search (Informed Search)](#2-a-search-informed-search)
   - [Struktur Data Min-Heap Priority Queue](#3-struktur-data-min-heap-priority-queue)
4. [Analisis & Perbandingan: UCS vs A*](#analisis--perbandingan-ucs-vs-a)
5. [Fitur-Fitur Utama](#fitur-fitur-utama)
6. [Spesifikasi Visual & Desain Prosedural](#spesifikasi-visual--desain-prosedural)
7. [Struktur Direktori & Arsitektur Kode](#struktur-direktori--arsitektur-kode)
8. [Panduan Instalasi & Menjalankan](#panduan-instalasi--menjalankan)
9. [Kontrol Permainan](#kontrol-permainan)
10. [Roadmap Pengembangan: Tahap 2 (Adversarial Search)](#roadmap-pengembangan-tahap-2-adversarial-search)

---

## Tentang Proyek

**Infernal Pathfinding Game** adalah aplikasi game web interaktif dan simulator visualisasi kecerdasan buatan (*AI Pathfinding*) bertema **Inferno / Neraka**. Proyek ini dikembangkan untuk mendemonstrasikan secara nyata bagaimana agen AI (NPC Demon) memperhitungkan dan melacak jalur terpendek menuju target dinamis (Player / Lost Soul) secara *real-time* di lingkungan labirin berapi dengan berbagai rintangan.

Aplikasi ini menyandingkan dua algoritma pencarian fundamental dalam ranah *Artificial Intelligence*:
1. **Uniform-Cost Search (UCS)** — Algoritma pencarian tanpa informasi (*Uninformed Search*).
2. **A\* Search** — Algoritma pencarian berinformasi (*Informed Search*) dengan fungsi heuristik Manhattan.

Pemain dapat memantau secara langsung perbedaan kinerja kedua algoritma melalui panel metrik yang mencakup **jumlah simpul dieksplorasi (*Nodes Expanded*)**, **bobot jalur (*Path Cost*)**, dan **waktu eksekusi (*Execution Time*)**.

---

## Konsep & Mekanik Permainan

- **Role Pemain (Lost Soul)**: Jiwa yang terjebak di neraka dan harus bermanuver menghindari kejaran iblis menggunakan kendali keyboard.
- **Role Agen AI (Hell Demon)**: Iblis pemburu yang secara kontinu menghitung jalur optimal untuk mendekati dan menangkap Lost Soul.
- **Dynamic Live Pursuit**: Setiap kali Player berpindah petak, NPC Demon langsung memperbarui rute terpendek menggunakan algoritma yang sedang aktif.
- **Jarak Spawn Aman (*Safe Distance*)**: Posisi awal Player dan Demon diatur secara acak dengan jarak Manhattan minimal **14 petak**, memastikan pemain memiliki ruang awal yang adil untuk bermanuver.
- **Game Over & New Random Map**: Ketika Demon berhasil menyentuh Player, permainan seketika terhenti (*freeze*) dan memunculkan jendela modal **YOU WERE CAUGHT!**. Menekan tombol **Try Again** akan langsung mengacak labirin rintangan baru serta menata ulang posisi karakter.

---

## Algoritma Pencarian Jalur

### 1. Uniform-Cost Search (UCS / Dijkstra)
- **Kategori**: *Uninformed Search* / *Brute-force Informed by Path Cost*.
- **Fungsi Evaluasi**: 
  $$f(n) = g(n)$$
  Di mana $g(n)$ adalah akumulasi biaya aktual dari titik awal ke simpul $n$.
- **Karakteristik**:
  - Mengeksplorasi ruang pencarian secara melingkar (*radial expansion*) ke segala arah tanpa memiliki pemahaman arah target berada.
  - Menjamin solusi optimal (lintasan terpendek), namun memerlukan eksplorasi simpul (*nodes expanded*) dalam jumlah yang jauh lebih banyak.

### 2. A* Search (Informed Search)
- **Kategori**: *Heuristic Search / Best-First Search*.
- **Fungsi Evaluasi**:
  $$f(n) = g(n) + h(n)$$
  Di mana $g(n)$ adalah biaya aktual dari awal ke simpul $n$, dan $h(n)$ adalah estimasi biaya dari simpul $n$ ke target.
- **Fungsi Heuristik (Manhattan Distance)**:
  $$h(n) = |x_n - x_{target}| + |y_n - y_{target}|$$
  Karena perpindahan karakter dibatasi pada 4 arah ortogonal (atas, bawah, kiri, kanan) dengan biaya langkah seragam, heuristik Manhattan bersifat *admissible* ($h(n) \le h^*(n)$) dan *consistent*, sehingga menjamin rute yang dihasilkan selalu optimal dengan jumlah simpul yang dieksplorasi jauh lebih sedikit.

### 3. Struktur Data Min-Heap Priority Queue
Kedua algoritma memanfaatkan struktur data **Min-Heap Binary Priority Queue** (`src/utils/PriorityQueue.js`) untuk menyimpan *frontier*:
- Operasi penyisipan simpul (`enqueue`): $O(\log V)$
- Operasi pengambilan simpul prioritas terendah (`dequeue`): $O(\log V)$
- Menghasilkan kompleksitas waktu total yang efisien: $O((V + E) \log V)$

---

## Analisis & Perbandingan: UCS vs A*

| Kriteria Pembanding | Uniform-Cost Search (UCS) | A* Search (Manhattan Heuristic) |
|---|---|---|
| **Jenis Algoritma** | *Uninformed Search* | *Informed Search* |
| **Fungsi Pemandu** | Hanya biaya lintasan $g(n)$ | Biaya lintasan + Estimasi jarak $g(n) + h(n)$ |
| **Arah Eksplorasi** | Melingkar merata ke segala arah (*radial*) | Terfokus mengarah ke posisi Player (*directional*) |
| **Nodes Expanded** | **Sangat Banyak** (boros memori dan komputasi) | **Sangat Sedikit** (fokus dan efisien) |
| **Optimalitas Solusi** | **Optimal** (pasti rute terpendek) | **Optimal** (karena heuristik *admissible*) |
| **Kompleksitas Memori** | Tinggi | Jauh lebih hemat |
| **Performa Real-Time** | Terasa berat jika grid bertambah luas | Sangat ringan untuk pengejaran live game |

---

## Fitur-Fitur Utama

1. **Arena Permainan Terpusat (*Centered Canvas Layout*)**:
   - Canvas berukuran tetap $800 \times 576\text{ px}$ ($25 \times 18$ petak grid @ $32\text{ px}$) berada tepat di tengah halaman (*viewport centering*) tanpa distorsi rasio aspek.
2. **Pembangkitan Peta Acak (*Procedural Random Maze*)**:
   - Peta diisi kombinasi dinding obsidian, kolam lava, dan kristal magma dengan pola persebaran alami.
   - Peta otomatis dibuat ulang secara dinamis saat menekan tombol *New Random Map* atau *Try Again*.
3. **Live Debug Overlay & Legend Terapung**:
   - Panel HUD transparan di pojok kanan atas menampilkan metrik performa algoritma secara *real-time*.
   - Dilengkapi panduan legenda visual elemen map, karakter, dan visualisasi jalur.
4. **Menu Pengaturan Terpusat (*Centered Game Settings Modal*)**:
   - Menu berbentuk modal popup di tengah layar (seperti game konsol/PC) yang dapat diakses kapan saja via tombol Menu (kiri atas) atau melalui tombol *Game Settings* saat tertangkap.
   - Fitur **Auto-Pause**: Permainan otomatis dijeda ketika menu pengaturan dibuka agar pemain tidak terdesak.
5. **Kontrol Pause / Resume Mandiri**:
   - Dukungan hotkey keyboard (`P` atau `Spacebar`) untuk jeda cepat.
6. **Modal Game Over & Menu Terintegrasi**:
   - Popup tengah saat tertangkap (*YOU WERE CAUGHT!*), menyediakan opsi langsung untuk *Try Again* atau membuka *Game Settings* guna mengganti algoritma/peta.

---

## Spesifikasi Visual & Desain Prosedural

Sesuai dengan dokumen spesifikasi desain (*PRD Section 4.2*), seluruh elemen visual dirender secara prosedural menggunakan Phaser Graphics & CSS Glow tanpa memerlukan file gambar eksternal yang lambat dimuat:

| Objek | Visual Prosedural | Representasi Teknis |
|---|---|---|
| **Tile Walkable** | Quadrant abu-gelap (`#1e1e24`) dengan garis retakan lava tipis (`#ff5500`) | Petak jalan normal (Dapat dilalui) |
| **Tile Lava Pit** | Petak merah-oranye membara (`#ff4d00`) + lingkaran inti pendar berdenyut (`#ffe600`) | Rintangan cair / jurang api (Tidak dapat dilalui) |
| **Tile Obsidian Wall** | Kotak hitam pekat (`#0d0d11`) dengan double border merah crimson tegas (`#ff0054`) | Dinding batu vulkanik (Rintangan keras) |
| **Tile Kristal Magma** | Bentuk belah ketupat/diamond kuning-oranye (`#ff9f1c`) dengan pendaran neon | Kristal panas berduri (Rintangan statis) |
| **Lost Soul (Player)** | Orb bulat cyan / neon soul-blue (`#00f5d4`) dengan aura pendaran lembut | Karakter utama yang digerakkan pemain |
| **Hell Demon (NPC)** | Orb bulat merah crimson membara (`#ff0054`) dengan ekspresi pemburu | Musuh pencari jalur otomatis |
| **Jalur Optimal (Path)** | Titik-titik garis emas berkilau (*Radiant Fiery Gold* `#ffbe0b`) | Lintasan terpendek hasil kalkulasi algoritma |
| **Frontier (Visited)** | Kotak translucent soul-yellow (`rgba(255, 204, 0, 0.25)`) | Petak yang sempat diperiksa oleh algoritma |

---

## Struktur Direktori & Arsitektur Kode

```text
hell-pathfinder/
├── index.html                 # Struktur DOM, UI HUD, Drawer, & Modal
├── package.json               # Konfigurasi dependensi (Vite & Phaser 3)
├── vite.config.js             # Konfigurasi bundler Vite
├── README.md                  # Dokumentasi komprehensif modul ini
└── src/
    ├── main.js                # Entry point & inisialisasi Phaser Game Config
    ├── infernal.css           # Styling tema inferno gelap, glassmorphism, & modal
    ├── core/                  # Engine inti AI & Grid (Decoupled dari renderer)
    │   ├── GridManager.js     # Representasi matriks 2D, tipe petak, & validasi gerak
    │   ├── Pathfinder.js      # Kelas dasar abstrak algoritma pathfinding
    │   ├── UCS.js             # Logika Uniform-Cost Search murni
    │   └── AStar.js           # Logika A* Search dengan Manhattan Heuristic
    ├── scenes/
    │   └── PathfindingScene.js# Scene Phaser: loop update, render grafik, & state game
    └── utils/
        ├── PriorityQueue.js   # Min-Heap Priority Queue teroptimasi
        └── TextureFactory.js  # Utilitas pembangkit grafis prosedural
```

---

## Panduan Instalasi & Menjalankan

### Prasyarat Sistem
- **Node.js**: Versi 18.0.0 atau lebih baru ([Unduh Node.js](https://nodejs.org/))
- **NPM**: Bawaan dari instalasi Node.js
- **Modern Web Browser**: Google Chrome, Mozilla Firefox, Microsoft Edge, atau Brave.

### Langkah Menjalankan:

1. **Masuk ke Direktori Proyek**:
   ```bash
   cd hell-pathfinder
   ```

2. **Instal Dependensi**:
   ```bash
   npm install
   ```

3. **Jalankan Server Lokal (Vite Dev Server)**:
   ```bash
   npm run dev
   ```

4. **Akses Permainan**:
   Buka peramban (browser) dan buka tautan lokal yang tertera pada terminal (default: **`http://localhost:5173/`**).

---

## Kontrol Permainan

| Tombol / Antarmuka | Fungsi & Aksi |
|---|---|
| **W** / **Up Arrow (↑)** | Bergerak 1 petak ke atas |
| **S** / **Down Arrow (↓)** | Bergerak 1 petak ke bawah |
| **A** / **Left Arrow (←)** | Bergerak 1 petak ke kiri |
| **D** / **Right Arrow (→)** | Bergerak 1 petak ke kanan |
| **P** / **Spacebar** | Menjeda (*Pause*) atau Melanjutkan (*Resume*) permainan |
| **Tombol Menu (Burger)** | Membuka laci pengaturan (Permainan otomatis di-pause) |
| **Radio Algorithm** | Mengganti algoritma AI pemburu antara **A\*** dan **UCS** secara langsung |
| **Button "New Random Map"** | Mengacak ulang susunan labirin rintangan dan lokasi karakter |
| **Button "Try Again"** | Muncul pada modal saat tertangkap untuk memulai ronde baru di map acak baru |

---

## Roadmap Pengembangan: Tahap 2 (Adversarial Search)

Berdasarkan silabus perkuliahan dan konfirmasi dosen pengampu (*Pak Yudi*), pengembangan tahap berikutnya dari proyek ini akan mengintegrasikan topik **Adversarial Search (Pencarian Berlawanan)**:

- **Konsep Pertarungan (Battle System)**: Integrasi mekanik Health Point (HP), perangkap, atau kemampuan serang/bertahan antar entitas.
- **Algoritma Minimax & Alpha-Beta Pruning**: NPC tidak hanya mengejar titik koordinat statis, namun memperhitungkan langkah terbaik pemain $N$-langkah ke depan untuk memojokkan pemain (*decision tree*).
- **Arsitektur Modular**: Berkat struktur kode yang modular pada `src/core/`, modul baru seperti `Minimax.js` atau `AlphaBeta.js` dapat langsung dihubungkan ke `PathfindingScene.js` tanpa merombak sistem grafis yang telah dibangun.

