
# 👜 SHOP BAG
### Find Your Everyday Style.

SHOP BAG merupakan website e-commerce sederhana yang berfokus pada penjualan berbagai jenis tas secara online. Website ini dirancang dengan tampilan modern, minimalis, dan responsif untuk memberikan pengalaman berbelanja yang nyaman bagi pengguna.

Proyek ini dikembangkan dengan mempertahankan identitas visual dari desain awal `index-revisi.html`, serta menambahkan berbagai fitur fungsional untuk pelanggan dan administrator.

---

## 🎯 Tujuan Proyek

1. Membangun website toko tas online yang interaktif dan responsif.
2. Memudahkan pelanggan mencari dan melihat berbagai koleksi tas.
3. Menyediakan fitur favorit dan simpan produk.
4. Mengintegrasikan pemesanan produk melalui WhatsApp.
5. Menyediakan dashboard admin untuk mengelola produk dan pengaturan toko.
6. Mengimplementasikan penyimpanan data menggunakan database.

---

## ✨ Fitur Website

### 1. Fitur Pelanggan

- **Homepage:** Menampilkan halaman utama dengan informasi dan koleksi unggulan SHOP BAG.
- **Kategori Produk:** Menampilkan produk berdasarkan kategori:
  - Semua Tas
  - Backpack
  - Handbag
  - Shoulder Bag
  - Tote Bag
  - Sling Bag
- **Katalog Produk:** Menampilkan daftar produk lengkap dengan foto, nama, kategori, deskripsi, dan harga.
- **Pencarian Produk:** Mencari produk berdasarkan nama.
- **Filter Harga:** Memfilter produk berdasarkan rentang harga.
- **Pengurutan Produk:** Mengurutkan produk berdasarkan rekomendasi, harga terendah, harga tertinggi, dan nama A–Z.
- **Detail Produk:** Menampilkan informasi produk melalui popup.
- **Favorit:** Menyimpan produk favorit pelanggan.
- **Simpan Produk:** Menyimpan produk secara terpisah dari fitur favorit.
- **Pesan via WhatsApp:** Mengarahkan pelanggan ke WhatsApp dengan pesan pemesanan otomatis.

### 2. Dashboard Admin

Dashboard admin merupakan halaman khusus untuk mengelola website SHOP BAG.

Fitur yang tersedia:

- **Login Admin:** Autentikasi menggunakan username dan password.
- **Ringkasan Dashboard:** Menampilkan total produk, jumlah klik WhatsApp, dan produk paling banyak diklik.
- **Manajemen Produk (CRUD):**
  - Menambahkan produk.
  - Melihat daftar produk.
  - Mengedit informasi produk.
  - Menghapus produk.
- **Upload Foto:** Mendukung format JPG, PNG, dan WebP dengan ukuran maksimal 2 MB.
- **Pengaturan Toko:** Mengubah nama toko, nomor WhatsApp, serta alamat atau informasi kontak.
- **Ganti Password:** Mengubah password administrator.
- **Logout:** Mengakhiri sesi administrator.

---

## 🛍️ Kategori dan Produk

Website SHOP BAG menyediakan beberapa kategori tas dengan produk contoh berikut:

| No. | Nama Produk | Kategori |
|---|---|---|
| 1 | Luna Mini Handbag | Handbag |
| 2 | Mila Shoulder Bag | Shoulder Bag |
| 3 | Daily Canvas Tote | Tote Bag |
| 4 | Classic Mini Sling | Sling Bag |
| 5 | Urban Backpack | Backpack |
| 6 | Sora Everyday Bag | Handbag |
| 7 | Nara Soft Tote | Tote Bag |
| 8 | Kira Mini Sling | Sling Bag |

**Catatan:** Produk, foto, dan informasi harga awal merupakan data contoh yang dapat diperbarui melalui dashboard admin.

---

## 💬 Integrasi WhatsApp

SHOP BAG menyediakan fitur pemesanan langsung melalui WhatsApp.

Ketika pelanggan menekan tombol **Pesan via WhatsApp**, website akan membuka WhatsApp dengan pesan otomatis yang berisi:

- Nama produk.
- Kategori produk.
- Harga produk.
- Pertanyaan mengenai ketersediaan produk.

Nomor WhatsApp diambil dari pengaturan toko yang dikelola administrator.

Setiap klik tombol WhatsApp juga dicatat ke database untuk keperluan statistik dashboard admin.

---

## 🛠️ Teknologi yang Digunakan

Teknologi pengembangan disesuaikan dengan dukungan lingkungan Freebuff.

- HTML – Struktur halaman website.
- CSS – Desain dan tampilan antarmuka.
- JavaScript – Interaksi dan fungsionalitas website.
- Node.js + Express – Backend aplikasi jika diperlukan.
- SQLite – Database aplikasi jika diperlukan.
- LocalStorage – Penyimpanan data favorit dan simpan produk.
- WhatsApp API Link – Integrasi pemesanan melalui WhatsApp.

*Catatan: Node.js, Express, dan SQLite digunakan apabila teknologi bawaan Freebuff tidak menyediakan kebutuhan backend dan database.*

---

## 🗄️ Penyimpanan Data

Data utama aplikasi disimpan dalam database agar tetap tersedia setelah halaman diperbarui.

Data yang disimpan meliputi:

1. Data produk.
2. Data akun administrator.
3. Pengaturan toko.
4. Statistik klik WhatsApp.

Sementara itu, fitur favorit dan simpan produk menggunakan LocalStorage pada browser pengguna.

Password administrator disimpan dalam bentuk hash di backend untuk meningkatkan keamanan autentikasi.

---

## 🔐 Akses Dashboard Admin

Dashboard admin dapat diakses melalui tautan **Admin** pada bagian footer website.

Akun demo awal:

| Keterangan | Informasi |
|---|---|
| Username | admin |
| Password | admin |

Administrator disarankan mengganti password demo setelah login pertama kali.

---

## 📱 Desain dan Responsivitas

SHOP BAG menggunakan konsep desain minimalis dengan perpaduan warna natural dan elemen visual yang lembut.

Palet warna utama:
- Paper: `#fbfaf6`
- Mist: `#eef3ec`
- Sage: `#a9bfa8`
- Forest: `#2f4a3d`
- Ink: `#1f2a24`
- Peach: `#f4c9b0`
- Terracotta: `#c8643f`

Karakteristik desain:
- Font Georgia untuk judul dan logo.
- Font Inter atau sans-serif untuk teks.
- Kartu dan tombol dengan sudut membulat.
- Animasi dan efek hover yang lembut.
- Layout responsif untuk desktop dan perangkat mobile.
- Navigasi hamburger pada layar HP.

---

## 🚀 Cara Menjalankan Proyek

Cara menjalankan aplikasi menyesuaikan teknologi yang digunakan oleh Freebuff.

Jika menggunakan Node.js dan Express:

1. Clone atau download repository.
2. Buka folder proyek menggunakan Visual Studio Code.
3. Instal dependency yang diperlukan.
4. Jalankan backend sesuai konfigurasi proyek.
5. Buka website melalui browser menggunakan alamat server lokal.

---

## 📌 Batasan Fitur

Untuk menjaga proyek tetap sederhana dan mudah dikembangkan, beberapa fitur berikut tidak termasuk dalam ruang lingkup aplikasi:

- Checkout dan pembayaran online.
- Manajemen pesanan.
- Keranjang belanja.
- Galeri banyak foto untuk setiap produk.
- Filter berdasarkan warna.
- Statistik pengunjung.
- Grafik analisis.

---

## 👨‍💻 Informasi Proyek

| Keterangan | Detail |
|---|---|
| Nama Proyek | SHOP BAG |
| Tagline | Find Your Everyday Style. |
| Jenis Aplikasi | E-Commerce Website |
| Kategori | Online Bag Store |
| Platform | Web Application |
| Target Pengguna | Pelanggan dan Administrator |

---

## 📄 Lisensi

Proyek SHOP BAG dikembangkan untuk keperluan pembelajaran, pengembangan aplikasi berbasis web, dan implementasi teknologi informasi.
