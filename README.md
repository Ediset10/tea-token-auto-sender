# tea-token-auto-sender
 "Script untuk mengirim token ERC-20 secara otomatis di Tea Sepolia Testnet"
Tea Token Auto Sender
A simple Node.js script to automate token transfers on the Tea Sepolia Testnet using Web3.js. This script supports sending tokens from a CSV file or manual input, with a maximum limit of 1,000,000,000 tokens per recipient.
Features
Send tokens using a default CSV file (data/recipients.csv).

Manually input recipients and amounts.

Send a fixed amount to recipients listed in a CSV file from a customizable list (data/csv_list.txt).

Supports two tokens: TINU and Wen TGE (configurable in src/auto-sender.js).

Logs transactions to logs/transaction_log.txt.

Maximum token limit: 1,000,000,000 per recipient.

Prerequisites
Node.js: Version 16.x or higher.

NPM: Comes with Node.js.

Tea Sepolia Testnet Access: Ensure you have a private key and sufficient testnet tokens.

Text Editor: For editing files (e.g., nano on VPS, any editor on Termux).

Installation and Usage
On VPS (Linux)
This guide assumes you're using a Linux VPS (e.g., Ubuntu).
1. Clone the Repository
bash

git clone https://github.com/yourusername/tea-token-auto-sender.git
cd tea-token-auto-sender

Replace yourusername with your GitHub username if you host this on GitHub.
2. Install Dependencies
bash

npm install web3 dotenv csv-parser

3. Configure Environment Variables
Create a .env file in the project root:
bash

nano .env

Add the following:

PRIVATE_KEY=your_private_key_here
TOKEN_ADDRESS=your_default_token_address

PRIVATE_KEY: Your wallet private key (without 0x prefix).

TOKEN_ADDRESS: Default token address (optional, can be overridden in script).

Save and exit (Ctrl+O, Enter, Ctrl+X).
4. Prepare CSV Files
Create a data directory:
bash

mkdir data

Create data/csv_list.txt to list your CSV files:
bash

nano data/csv_list.txt

Example content:

recipients.csv
recipients_tokenA.csv

Create a sample CSV file (e.g., data/recipients.csv):
bash

nano data/recipients.csv

Example content:

address,amount
0xRecipientAddress1,10
0xRecipientAddress2,5

Note: The amount column is ignored for manual amount modes.

5. Create Logs Directory
bash

mkdir logs

6. Run the Script
bash

node src/auto-sender.js

Follow the prompts to choose a mode:
Option 1: Use default CSV (data/recipients.csv).

Option 2: Manual token and recipient input.

Option 3: Select token and CSV, then input amount (max 1,000,000,000).

Option 4: Manual token address, select CSV, then input amount.

Example:

Pilih mode pengiriman token:
3. Pilih token dan CSV dari daftar + jumlah manual
Masukkan pilihan (1-4): 3

Daftar Token Tersedia:
1. TINU (0xb2fe26E783f24E30EbDe2261928EC038dbf6478d)
Pilih nomor token: 1

Daftar File CSV Tersedia:
1. recipients.csv
Pilih nomor file CSV: 1
Masukkan jumlah token untuk semua penerima (maks 1,000,000,000): 1000

7. Check Logs
View transaction logs:
bash

cat logs/transaction_log.txt

8. (Optional) Run with PM2
To keep the script running in the background:
bash

npm install -g pm2
pm2 start src/auto-sender.js --name tea-token-auto-sender
pm2 logs tea-token-auto-sender # View logs
pm2 stop tea-token-auto-sender # Stop

On Termux (Android)
Termux is a terminal emulator for Android. Here's how to set it up.
1. Install Termux
Download Termux from F-Droid or Google Play Store.

Open Termux and update packages:
bash

pkg update && pkg upgrade

2. Install Node.js and Git
bash

pkg install nodejs git

3. Clone the Repository
bash

git clone https://github.com/yourusername/tea-token-auto-sender.git
cd tea-token-auto-sender

4. Install Dependencies
bash

npm install web3 dotenv csv-parser

5. Configure Environment Variables
Create a .env file:
bash

nano .env

Add:

PRIVATE_KEY=your_private_key_here
TOKEN_ADDRESS=your_default_token_address

Save and exit (Ctrl+O, Enter, Ctrl+X).
6. Prepare CSV Files
Create data directory:
bash

mkdir data

Create data/csv_list.txt:
bash

nano data/csv_list.txt

Example:

recipients.csv
recipients_tokenA.csv

Create a CSV file (e.g., data/recipients.csv):
bash

nano data/recipients.csv

Example:

address,amount
0xRecipientAddress1,10
0xRecipientAddress2,5

7. Create Logs Directory
bash

mkdir logs

8. Run the Script
bash

node src/auto-sender.js

Follow the same prompts as in the VPS section.
9. Check Logs
bash

cat logs/transaction_log.txt

10. (Optional) Keep Running in Background
Use termux-toast to notify when done, or run in a new session:
bash

termux-toast "Script started" && node src/auto-sender.js

To stop, press Ctrl+C in the Termux session.

