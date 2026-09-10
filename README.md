# Battery Swap Monitoring Dashboard

Internal dashboard untuk memonitor cabinet battery swap, status slot, aktivitas swap, dan heartbeat cabinet.

## Tech Stack

* Next.js
* TypeScript
* Tailwind CSS
* Supabase PostgreSQL
* Zod

## Features

### Cabinet List

* Menampilkan cabinet code
* Menampilkan branch
* Filter status: `ONLINE`, `OFFLINE`, `MAINTENANCE`
* Search berdasarkan cabinet code atau branch
* Menampilkan occupied slots / total slots
* Menampilkan jumlah swap dalam 24 jam terakhir
* Menampilkan last heartbeat
* Sorting berdasarkan jumlah swap 24 jam
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
* Chart swap per jam selama 24 jam terakhir
* 20 transaksi swap terbaru

---

## Requirements

Pastikan sudah terinstall:

* Node.js
* npm
* Supabase CLI

---

## Getting Started

### 1. Clone repository

```bash
git clone <repository-url>
cd battery-swap-dashboard
```

### 2. Install dependencies

```bash
npm install
```

### 3. Setup Supabase

Buat project baru di Supabase.

Setelah project dibuat, siapkan Supabase CLI dan login:

```bash
npx supabase login
```

Kemudian link project lokal dengan project Supabase:

```bash
npx supabase link --project-ref <project-ref>
```

`<project-ref>` dapat ditemukan pada URL project Supabase atau project settings.

### 4. Setup environment variables

Buat file `.env.local` di root project:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SECRET_KEY=your_supabase_service_role_key
```

`SUPABASE_SECRET_KEY` hanya digunakan pada server-side API dan seed. Jangan expose secret key ke client.

### 5. Jalankan database migration

Project menggunakan Supabase migration.

Push migration ke database:

```bash
npx supabase db push
```

Migration akan membuat:

* `branches`
* `cabinets`
* `slots`
* `swap_transactions`
* Database indexes
* Database functions untuk agregasi swap

### 6. Seed database

Setelah migration selesai, jalankan:

```bash
npm run seed
```

Seed menghasilkan:

* 10 branches
* 50 cabinets
* 600 slots
* 20,000 swap transactions

Data transaksi tersebar selama 30 hari terakhir.

### 7. Jalankan development server

```bash
npm run dev
```

Buka:

```text
http://localhost:3000
```

---

## Database

Database terdiri dari empat tabel utama:

### `branches`

Menyimpan informasi branch cabinet.

### `cabinets`

Menyimpan:

* Cabinet code
* Branch
* Status
* Total slots
* Last heartbeat

### `slots`

Menyimpan:

* Cabinet
* Slot number
* Slot state
* Battery SOC

Setiap cabinet memiliki 12 slot.

### `swap_transactions`

Menyimpan:

* Cabinet
* Slot
* Waktu swap
* Battery ID

---

## API

### GET `/api/cabinets`

Mengambil daftar cabinet.

Mendukung:

* Search cabinet code
* Search branch
* Filter status
* Pagination
* Occupied slots
* Total slots
* Swap count 24 jam
* Last heartbeat

Contoh:

```text
/api/cabinets?q=Jakarta&status=ONLINE&page=1
```

### GET `/api/cabinets/[id]`

Mengambil detail cabinet.

Response mencakup:

* Cabinet information
* Slots
* Hourly swap count selama 24 jam
* 20 transaksi swap terbaru

Contoh:

```text
/api/cabinets/cabinet-001
```

API menggunakan Zod untuk validasi input dan mengembalikan error response dengan format yang konsisten.

---

## Query & Performance

Jumlah swap 24 jam dihitung langsung di PostgreSQL menggunakan database function:

```text
get_swap_count_24h()
```

Data swap per jam juga dihitung di database menggunakan:

```text
get_hourly_swap_count()
```

Hourly aggregation menggunakan `generate_series` untuk menghasilkan 24 hourly buckets, termasuk jam yang tidak memiliki transaksi.

Query tidak mengambil seluruh transaksi ke JavaScript untuk melakukan agregasi.

Data slot pada cabinet list juga diambil secara batch sehingga tidak menggunakan N+1 query.

---

## Pagination

Pagination menggunakan **offset-based pagination** dengan parameter `page`.

Contoh:

```text
/api/cabinets?page=2
```

Offset pagination dipilih karena:

* Sederhana untuk kebutuhan dashboard internal
* Mudah digunakan dengan Previous / Next
* Mudah disimpan di URL
* Sesuai dengan kebutuhan mini feature ini

---

## Assumptions

* Setiap cabinet memiliki 12 slot.
* Slot dianggap **occupied** apabila state bukan `EMPTY`.
* `EMPTY` dan `LOCKED` tidak memiliki nilai SOC pada seed.
* Status cabinet terdiri dari `ONLINE`, `OFFLINE`, dan `MAINTENANCE`.
* Data seed bersifat synthetic untuk kebutuhan dashboard.
* Transaksi swap tersebar selama 30 hari terakhir.

---

## UI States

Dashboard menangani:

* Loading state ketika mengambil data
* Empty state ketika data tidak tersedia
* Error state ketika API gagal

Kondisi tersebut tersedia pada cabinet list dan cabinet detail.

---

## Trade-offs

* Offset pagination digunakan karena lebih sederhana dan cukup untuk kebutuhan dashboard ini.
* Agregasi swap 24 jam dilakukan di PostgreSQL agar tidak mengambil seluruh transaction records ke application layer.
* Chart swap dibuat tanpa library chart tambahan karena kebutuhan chart pada feature ini sederhana.
* Search dilakukan di server melalui API, bukan filtering data di client.

---

## Unfinished / Known Limitations

* Data seed masih berupa synthetic/random data dan bukan data produksi.
* Seed menggunakan ID yang tetap. Menjalankan seed kembali pada database yang sudah berisi data dapat menyebabkan duplicate key.

---

## AI Tools Used

AI digunakan sebagai development assistant untuk:

* Membantu memahami requirement assignment
* Review implementasi API dan database query
* Membantu debugging
* Membantu pengecekan requirement
* Membantu penyusunan dokumentasi

Implementasi dan keputusan akhir tetap diverifikasi secara manual.

---

## Available Scripts

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Production

```bash
npm run start
```

### Seed

```bash
npm run seed
```
