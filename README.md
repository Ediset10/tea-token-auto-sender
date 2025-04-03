Tea Token Auto Sender
Ini adalah program sederhana untuk mengirim token di Tea Sepolia Testnet secara otomatis. Anda bisa mengirim token ke banyak alamat dari file CSV atau memasukkan alamat satu per satu. Batas maksimum pengiriman adalah 1 juta token per alamat.
Fitur
Kirim token dari file CSV (data/recipients.csv).

Masukkan alamat dan jumlah token secara manual.

Pilih file CSV dan jumlah token untuk semua alamat.

Mendukung dua token: TINU dan Wen TGE.

Catatan pengiriman disimpan di logs/transaction_log.txt.

Yang Dibutuhkan
Node.js (program untuk menjalankan script).

Kunci pribadi wallet (PRIVATE_KEY) dan token testnet.

Text editor (misalnya nano).

Cara Pakai di VPS (Linux)
Download Program

Ketik di terminal:
git clone https://github.com/yourusername/tea-token-auto-sender.git
cd tea-token-auto-sender

Ganti "yourusername" dengan nama GitHub Anda.

Pasang Alat yang Dibutuhkan

Ketik:
npm install web3 dotenv csv-parser

Atur Kunci Pribadi

Buat file .env:
nano .env

Tulis:
PRIVATE_KEY=kunci_pribadi_anda
TOKEN_ADDRESS=alamat_token_default

Simpan (Ctrl+O, Enter, Ctrl+X).

Siapkan File CSV

Buat folder "data":
mkdir data

Buat file data/csv_list.txt:
nano data/csv_list.txt

Tulis nama file CSV, misalnya:
recipients.csv

Buat file CSV (contoh: data/recipients.csv):
nano data/recipients.csv

Tulis:
address,amount
0xAlamat1,10
0xAlamat2,5

Buat Folder untuk Catatan

Ketik:
mkdir logs

Jalankan Program

Ketik:
node src/auto-sender.js

Pilih opsi:
Pakai CSV default.

Masukkan alamat manual.

Pilih token dan CSV, lalu masukkan jumlah (maks 1 juta).

Contoh:
Pilih 3, pilih token 1, pilih CSV 1, masukkan 1000.

Lihat Catatan

Ketik:
cat logs/transaction_log.txt

Cara Pakai di Termux (Android)
Pasang Termux

Download dari Google Play atau F-Droid.

Update Termux:
pkg update && pkg upgrade

Pasang Node.js dan Git

Ketik:
pkg install nodejs git

Download Program

Ketik:
git clone https://github.com/yourusername/tea-token-auto-sender.git
cd tea-token-auto-sender

Pasang Alat yang Dibutuhkan

Ketik:
npm install web3 dotenv csv-parser

Atur Kunci Pribadi

Buat file .env:
nano .env

Tulis:
PRIVATE_KEY=kunci_pribadi_anda
TOKEN_ADDRESS=alamat_token_default

Simpan (Ctrl+O, Enter, Ctrl+X).

Siapkan File CSV

Buat folder "data":
mkdir data

Buat file data/csv_list.txt:
nano data/csv_list.txt

Tulis:
recipients.csv

Buat file CSV (contoh: data/recipients.csv):
nano data/recipients.csv

Tulis:
address,amount
0xAlamat1,10
0xAlamat2,5

Buat Folder untuk Catatan

Ketik:
mkdir logs

Jalankan Program

Ketik:
node src/auto-sender.js

Ikuti langkah seperti di VPS.

Lihat Catatan

Ketik:
cat logs/transaction_log.txt

Jika Ada Masalah
"Saldo token tidak cukup": Pastikan ada cukup token di wallet.

"PRIVATE_KEY tidak ditemukan": Periksa file .env.

"File CSV kosong": Cek file CSV-nya ada dan benar.

Jumlah lebih dari 1 juta: Masukkan jumlah kecil (maks 1,000,000).

Ubah Sesuai Keinginan
Tambah token: Edit tokenList di src/auto-sender.js.

Ubah batas: Ganti maxTokenLimit di src/auto-sender.js.

Lisensi
Gratis untuk digunakan dan diubah (MIT License).

