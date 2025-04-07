**Tea Token Auto Sender**
Script untuk Tx daily Tea Sepolia Testnet

**FITUR**
- Kirim token dari file CSV atau masukkan penerima secara manual
- Pilih jumlah alamat tujuan dari total di CSV + anda bisa mengatur token anda sendiri dengan memilih fitur No.4 juga bisa membuuat file csv sendiri jika tidak ingin menggunakan file yang sudah saya sediakan. 
- Animasi Tx Hash interaktif dengan emoji

**Tutorial**
Sebelum mulai, pastikan kamu sudah memiliki persyaratn yang ada
**1.Node JS** (Versi 14 atau lebih update)
check versi node `node -V`

**Instalasi**
**1.Untuk Termux** 
`pkg update && pkg upgrade`

**Pasang Git dan Nodejs**
`pkg install git nodejs`

**Clone Repository**
`https://github.com/Ediset10/tea-token-auto-sender.git
 cd tea-token-auto-sender`

**Instalasi Dependensi**
`npm install
# atau
yarn install`

*Warn jika mengalami masalah pastikan download aplikasi versi terbaru

**Untuk Windows**
- Download dan install [Nodejs](https://nodejs.org/en)
- Download dan Insatll git [Git](https://git-scm.com/downloads/win)
**Clone Repository**
`https://github.com/Ediset10/tea-token-auto-sender.git
 cd tea-token-auto-sender`
**Install Depensi**
`npm install`

**Untuk VPS**
Persiapan Awal
`# Update paket
sudo apt update && sudo apt upgrade -y

# Install Node.js dan npm
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs git

# Install PM2 untuk menjalankan aplikasi di background
npm install -g pm2`

- **Clone Repository**
`https://github.com/Ediset10/tea-token-auto-sender.git
 cd tea-token-auto-sender`

**Install Depensi**
`npm install`

**Jalankan Script**
`# Jalankan aplikasi dengan PM2
pm2 start Sepolia-multisender.js

# Pastikan aplikasi berjalan saat reboot
pm2 startup
pm2 save

# Melihat log
pm2 logs Sepolia-multisender.js`

**Cara Buat File .Env**
`# Untuk Linux/Mac/VPS
cp .env.example .env
nano .env

# Untuk Windows
copy .env.example .env
notepad .env

# Untuk Termux
nano .env`

**isi File ENV**
`PRIVATE_KEY=your_private_key_here
TOKEN_ADDRESS=your_token_address_here
`
**Click CTRL X + Y lalu enter**

**Warn**jangan upload file env ke github 
