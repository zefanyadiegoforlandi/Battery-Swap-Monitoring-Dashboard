# Battery Swap Monitoring Dashboard

Internal dashboard mini untuk membantu tim operasional memantau cabinet battery swap, status slot, aktivitas swap, dan heartbeat cabinet.

## Tech Stack

* Next.js 15 (App Router)
* TypeScript
* Tailwind CSS
* Supabase PostgreSQL
* Zod

---

## Features

### Cabinet List

* Menampilkan cabinet code
* Menampilkan branch
* Filter status: `ONLINE`, `OFFLINE`, `MAINTENANCE`
* Search berdasarkan cabinet code atau branch
* Menampilkan occupied slots / total slots
* Menampilkan jumlah swap 24 jam terakhir
* Menampilkan last heartbeat
Cabinet list diurutkan berdasarkan jumlah swap 24 jam terakhir secara descending (terbesar ke terkecil).
* Pagination
* Search, filter, dan pagination tersimpan di URL

### Cabinet Detail

* Informasi cabinet
* Grid 12 slot
* Status slot:

  * `EMPTY`
  * `CHARGING`
  * `FULL`
  * `LOCKED`
  * `FAULT`
* Battery SOC per slot
* Grafik jumlah swap per jam selama 24 jam terakhir
* 20 transaksi swap terbaru

---

# Requirements

Pastikan sudah terinstall:

* Node.js
* npm
* Supabase CLI

---

# Getting Started

## 1. Clone Repository

```bash
git clone <repository-url>
cd battery-swap-dashboard
```

## 2. Install Dependencies

```bash
npm install
```

## 3. Setup Supabase

Buat project baru di Supabase.

Setelah project dibuat, siapkan Supabase CLI dan login:

```bash
npx supabase login
```

Kemudian link project lokal dengan project Supabase:

```bash
npx supabase link --project-ref <project-ref>
```

`<project-ref>` dapat ditemukan pada URL project Supabase atau pada project settings.

## 4. Setup Environment Variables

Buat file `.env` di root project:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
SUPABASE_SECRET_KEY=your_supabase_service_role_key
```

`SUPABASE_SECRET_KEY` hanya digunakan pada server-side API dan seed. Secret key tidak digunakan pada client.

## 5. Jalankan Database Migration

Push migration ke database:

```bash
npx supabase db push
```

Migration membuat:

* `branches`
* `cabinets`
* `slots`
* `swap_transactions`
* Database indexes
* Database functions untuk agregasi swap

## 6. Seed Database

Setelah migration selesai, jalankan:

```bash
npm run seed
```

Seed menghasilkan:

* 10 branches
* 50 cabinets
* 600 slots
* 20.000 swap transactions

Data transaksi tersebar selama 30 hari terakhir.

## 7. Jalankan Development Server

```bash
npm run dev
```

Buka:

```text
http://localhost:3000
```

---

# Database

Database terdiri dari empat tabel utama.

## `branches`

Menyimpan informasi branch cabinet.

Field utama:

* `id`
* `name`

## `cabinets`

Menyimpan informasi cabinet.

Field utama:

* `id`
* `code`
* `branch_id`
* `status`
* `total_slots`
* `last_heartbeat_at`

## `slots`

Menyimpan informasi slot cabinet.

Field utama:

* `id`
* `cabinet_id`
* `slot_number`
* `state`
* `soc_percent`

## `swap_transactions`

Menyimpan aktivitas swap.

Field utama:

* `id`
* `cabinet_id`
* `slot_number`
* `swapped_at`
* `battery_id`

---

# API

## GET `/api/cabinets`

Mengambil daftar cabinet dengan search, filter, sorting, dan pagination.

Parameter:

* `q` — search berdasarkan cabinet code atau branch
* `status` — `ONLINE`, `OFFLINE`, atau `MAINTENANCE`
* `sort` — `asc` atau `desc`
* `page` — nomor halaman

Contoh:

```text
/api/cabinets?q=Jakarta&status=ONLINE&page=1&sort=asc
```
Response mencakup:

* cabinet data
* occupied slots
* total slots
* swap count 24 jam
* last heartbeat
* pagination information

Search dilakukan di server melalui database query, bukan filtering pada client.

## GET `/api/cabinets/[id]`

Mengambil detail sebuah cabinet.

Contoh:

```text
/api/cabinets/cabinet-001
```

Response mencakup:

* cabinet information
* slots
* hourly swap count selama 24 jam terakhir
* 20 transaksi swap terbaru

Input route parameter divalidasi menggunakan Zod.

API menggunakan response error dengan format:

```json
{
  "error": "Pesan error"
}
```

---

# Query & Performance

Agregasi dilakukan di PostgreSQL sehingga application layer tidak perlu mengambil seluruh transaksi untuk melakukan perhitungan.

## Swap 24 Jam

Jumlah swap 24 jam dihitung menggunakan kondisi rolling 24 hours:

```sql
swapped_at >= NOW() - INTERVAL '24 hours'
```

Artinya, "24 jam terakhir" dihitung mundur 24 jam dari waktu query dijalankan, bukan berdasarkan pergantian tanggal atau sejak tengah malam.

Function database yang tersedia:

```text
get_swap_count_24h()
```

Pada query cabinet list, agregasi swap 24 jam dilakukan langsung di function `search_cabinets()` melalui database CTE `swap_agg`.

## Slot Occupancy

Jumlah slot terisi dihitung langsung di database.

Slot dianggap **occupied** apabila state-nya:

```text
CHARGING
FULL
```

State berikut tidak dihitung sebagai occupied:

```text
EMPTY
LOCKED
FAULT
```

Perhitungan dilakukan melalui:

```sql
COUNT(*) FILTER (
    WHERE s.state IN ('CHARGING', 'FULL')
)
```

Frontend menerima hasil agregasi tersebut melalui field `occupied_slots` dan menampilkannya sebagai:

```text
occupied / total
```

## Swap Per Jam

Data swap per jam dihitung menggunakan:

```text
get_hourly_swap_count()
```

Function menggunakan `generate_series` untuk menghasilkan 24 hourly buckets, termasuk jam yang tidak memiliki transaksi.

Dengan pendekatan ini, chart tetap memiliki data untuk setiap jam selama 24 jam terakhir.

## Cabinet List

Query `search_cabinets()` melakukan agregasi slot dan swap di database menggunakan beberapa CTE:

* filtering cabinet
* agregasi occupied slots
* agregasi swap 24 jam
* penggabungan hasil

Dengan demikian tidak dilakukan N+1 query dari application layer.

Database index juga dibuat untuk membantu query berdasarkan:

* branch
* status
* cabinet code
* branch name
* cabinet + waktu transaksi
* waktu transaksi

---

# Pagination

Pagination menggunakan **offset-based pagination** dengan parameter `page`.

Contoh:

```text
/api/cabinets?page=2
```

Offset pagination dipilih karena:

* Sederhana untuk kebutuhan dashboard internal
* Mudah digunakan dengan Previous / Next
* Mudah disimpan di URL
* Sesuai dengan jumlah cabinet dan kebutuhan mini feature ini

---

# Assumptions

Spesifikasi sengaja tidak menentukan beberapa perilaku secara eksplisit. Keputusan berikut digunakan dalam implementasi.

### Rolling 24 Hours

"Swap 24 jam terakhir" didefinisikan sebagai **rolling 24 hours**, yaitu transaksi dengan:

```sql
swapped_at >= NOW() - INTERVAL '24 hours'
```

Jadi perhitungannya bukan sejak tengah malam.

### Cabinet Offline

Jika cabinet berstatus **`OFFLINE`**, dashboard tetap menampilkan **state slot terakhir yang tersimpan di database**.

Slot tidak otomatis diubah atau ditandai sebagai `STALE`, karena dashboard hanya menampilkan data terakhir yang diketahui dan spesifikasi tidak mendefinisikan batas waktu untuk menentukan slot stale.

### Empty Heartbeat

Jika `last_heartbeat_at` bernilai `NULL`, dashboard menampilkan:

```text
—
```

Hal ini menunjukkan bahwa data heartbeat belum tersedia tanpa membuat atau menebak nilai waktu.

### Slot Occupancy

Slot dianggap **occupied** hanya apabila state-nya:

```text
CHARGING
FULL
```

State `EMPTY`, `LOCKED`, dan `FAULT` tidak dihitung sebagai occupied.

Keputusan ini digunakan sebagai asumsi karena spesifikasi tidak mendefinisikan secara eksplisit hubungan antara setiap slot state dengan keberadaan baterai.

### Cabinet Capacity

Setiap cabinet memiliki 12 slot.

### Cabinet Status

Status cabinet terdiri dari:

```text
ONLINE
OFFLINE
MAINTENANCE
```

### Seed Data

Data seed bersifat synthetic untuk kebutuhan dashboard.

---

# UI States

Dashboard menangani tiga kondisi utama pada cabinet list dan cabinet detail.

## Loading

Ditampilkan ketika data sedang diambil dari API.

## Empty

Ditampilkan ketika request berhasil tetapi tidak ada data yang tersedia.

Contoh:

* Tidak ada cabinet yang sesuai dengan search/filter
* Tidak ada slot
* Tidak ada transaksi swap
* Tidak ada data swap hourly

## Error

Ditampilkan ketika request API gagal atau cabinet tidak ditemukan.

User mendapatkan pesan untuk mencoba memuat ulang halaman ketika terjadi kegagalan request.

---

# URL State

Search, filter status, dan pagination disimpan pada URL.

Contoh:

```text
/cabinets?q=Jakarta&status=ONLINE&page=2
```

Keuntungan:

* URL dapat di-share
* State tetap tersedia setelah refresh
* Browser back/forward tetap dapat digunakan
* Filter dan search tidak hanya tersimpan di state client

---

# Trade-offs

### Offset Pagination

Offset pagination dipilih karena implementasinya lebih sederhana dan sudah cukup untuk kebutuhan dashboard internal dengan jumlah cabinet yang relatif kecil.

### Database Aggregation

Agregasi swap 24 jam dilakukan di PostgreSQL agar tidak perlu mengambil seluruh transaction records ke JavaScript.

Agregasi occupied slots juga dilakukan di PostgreSQL agar perhitungan tidak perlu dilakukan di client.

### Chart

Chart dibuat menggunakan HTML/CSS/Tailwind tanpa library chart tambahan karena kebutuhan chart hanya berupa 24 bar hourly sederhana.

### Server-side Search

Search dilakukan di server/database agar data tidak perlu diambil seluruhnya ke client lalu difilter menggunakan JavaScript.

---

# Unfinished / Known Limitations

* Data seed masih berupa synthetic/random data dan bukan data produksi.
* Seed menggunakan ID yang tetap. Menjalankan seed kembali pada database yang sudah berisi data dengan ID yang sama dapat menyebabkan duplicate key.
* Cabinet `OFFLINE` masih menampilkan state slot terakhir dan belum memiliki indikator `STALE`.
* Belum terdapat authentication/authorization karena dashboard dibuat sebagai internal mini feature.
* Data tidak di-refresh secara real-time; perubahan data memerlukan request ulang.

---

# AI Tools Used

AI digunakan sebagai development assistant untuk:

* Membantu memahami requirement assignment
* Review implementasi API dan database query
* Membantu debugging
* Membantu pengecekan requirement
* Membantu menyusun dokumentasi

Implementasi dan keputusan akhir tetap diverifikasi secara manual.

---

# Git

Development menggunakan pendekatan **feature branch** agar setiap fitur dapat dikembangkan, diuji, dan diintegrasikan secara terpisah.

## Branch Structure

Branch yang digunakan:

```text
main
└── develop
    ├── feat/cabinet-api
    ├── feat/cabinet-detail
    └── feat/cabinet-list
```

### `main`

Branch utama yang berisi versi aplikasi yang sudah stabil dan siap digunakan.

### `develop`

Branch integrasi yang digunakan untuk menggabungkan feature sebelum masuk ke `main`.

### `feat/cabinet-api`

Branch untuk mengembangkan API cabinet, termasuk route handler, validasi input, query, dan agregasi data.

### `feat/cabinet-detail`

Branch untuk mengembangkan halaman detail cabinet beserta kebutuhan data detailnya.

### `feat/cabinet-list`

Branch untuk mengembangkan halaman daftar cabinet, termasuk search, filter, sorting, pagination, dan URL state.
### `database`

Branch untuk membuat tabel sql.

## Development Flow

Setiap feature dikerjakan pada branch `feat/...` masing-masing.

Contoh:

```text
feat/cabinet-api
feat/cabinet-detail
feat/cabinet-list
```

Setelah implementasi feature selesai:

1. Feature diperiksa secara manual.
2. Feature diuji secara manual berdasarkan requirement.
3. Jika hasil pengecekan sudah sesuai dan tidak ditemukan masalah, branch feature di-merge ke `develop`.
4. Feature berikutnya dikembangkan dan diintegrasikan dengan cara yang sama.
5. Setelah seluruh feature terintegrasi di `develop`, dilakukan pengecekan dan testing manual kembali untuk memastikan seluruh bagian aplikasi dapat berjalan bersama.
6. Jika `develop` sudah dianggap stabil, `develop` di-merge ke `main`.

Alur yang digunakan:

```text
Feature Development
        ↓
Manual Check
        ↓
Manual Test
        ↓
Merge ke develop
        ↓
Integration Check
        ↓
Integration Manual Test
        ↓
develop → main
```

Workflow ini digunakan agar perubahan setiap feature tetap terisolasi, proses integrasi lebih terkontrol, dan `main` hanya menerima versi yang sudah melalui pengecekan.

## Commit

Commit dibuat secara bertahap dengan pesan yang menjelaskan perubahan yang dilakukan.

Contoh:

```text
feat: add action button for detail cabinet
fix: complete cabinet detail in route
fix: response error in hourly error
```
Commit bertahap digunakan agar perubahan dapat dilacak dengan jelas selama development.

---

# Available Scripts

## Development

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Production

```bash
npm run start
```

## Seed

```bash
npm run seed
```
