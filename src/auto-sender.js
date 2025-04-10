// Fungsi untuk mengimpor modul secara dinamis
async function loadModules() {
    const Web3 = (await import('web3')).default;
    const fs = await import('fs');
    const csv = (await import('csv-parser')).default;
    const dotenv = (await import('dotenv')).default;
    const readline = await import('readline');
    const chalk = (await import('chalk')).default;
    const axios = (await import('axios')).default;

    // Konfigurasi dotenv
    dotenv.config();

    // Konfigurasi Tea Sepolia Testnet dengan RPC Alchemy
    const primaryRpc = 'https://tea-sepolia.g.alchemy.com/v2/xQ8HAvXGLFYFz_wrrppV4N0uNUpZA_VE';
    const web3 = new Web3(primaryRpc);
    const chainId = 10218;

    // Informasi akun dari .env
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) throw new Error('PRIVATE_KEY tidak ditemukan di file .env');
    const account = web3.eth.accounts.privateKeyToAccount(privateKey);
    const senderAddress = account.address;

    // Daftar token manual
    const tokenList = [
        { name: "TINU", address: "0xb2fe26E783f24E30EbDe2261928EC038dbf6478d" },
        { name: "Wen TGE", address: "0x3F2c9A99Af907591082E5962A7b39098d1249A43" },
        { name: "Wen JP", address: "0xec4b0c4925Bbed337841a513c7693489808cBDDF" }
    ];

    // ABI standar ERC-20
    const tokenABI = [
        {"constant":false,"inputs":[{"name":"_to","type":"address"},{"name":"_value","type":"uint256"}],"name":"transfer","outputs":[{"name":"","type":"bool"}],"type":"function"},
        {"constant":true,"inputs":[{"name":"_owner","type":"address"}],"name":"balanceOf","outputs":[{"name":"balance","type":"uint256"}],"type":"function"}
    ];

    // Konfigurasi
    const defaultCsvFilePath = 'data/recipients.csv';
    const csvListFile = 'data/csv_list.txt';
    const logFilePath = 'logs/transaction_log.txt';
    const decimals = 18;
    const csvDir = 'data/';
    const maxTokenLimit = 1000000000;
    const faucetUrl = 'https://faucet-sepolia.tea.xyz/api/claim'; // Asumsi endpoint API

    // Interface untuk input pengguna
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    // Fungsi untuk jeda acak dalam milidetik
    function randomDelay(min, max) {
        return new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * (max - min + 1)) + min));
    }

    // Fungsi untuk mengacak array
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    // Fungsi untuk logging
    function logToFile(message) {
        const timestamp = new Date().toISOString();
        fs.appendFileSync(logFilePath, `${timestamp}: ${message}\n`);
    }

    // Fungsi untuk tampilan header
    function displayHeader() {
        console.clear();
        console.log(chalk.bold.rgb(255, 165, 0)(`
   ┌────────────────────────────────────┐
   │ 🚀 TEA TOKEN SENDER v2.0 🚀        │
   │ Powered by ZUE - Tea Sepolia       │
   └────────────────────────────────────┘
`));
    }

    // Fungsi untuk animasi Tx Hash
    async function displayTxHashWithAnimation(txHash) {
        const frames = ['🌌', '🌠', '✨', '💫', '⚡', '🔥', '🌟', '🚀', '🎇', '🎆'];
        const buildUp = [
            '🔍 Fetching Tx Hash...',
            '🔗 Connecting to Blockchain...',
            '⚙ Processing Transaction...',
            '🌈 Finalizing Tx Hash...'
        ];
        
        for (let i = 0; i < buildUp.length; i++) {
            process.stdout.write(`\r${chalk.yellow(frames[i % frames.length] + ' ' + buildUp[i])}`);
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        let hashDisplay = '';
        for (let i = 0; i < txHash.length; i++) {
            hashDisplay += txHash[i];
            process.stdout.write(`\r${chalk.green('✅ Tx Hash: ' + hashDisplay + ' ' + frames[i % frames.length])}`);
            await new Promise(resolve => setTimeout(resolve, 50));
        }

        for (let i = 0; i < 5; i++) {
            process.stdout.write(`\r${chalk.green('✅ Tx Hash: ' + txHash + ' ' + frames[i % frames.length])}`);
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        process.stdout.write(`\r${chalk.green('✅ Tx Hash: ' + txHash)}\n`);
    }

    // Fungsi untuk membaca daftar file CSV
    function getCsvList() {
        try {
            const content = fs.readFileSync(csvListFile, 'utf8');
            return content.split('\n').filter(line => line.trim().endsWith('.csv') && fs.existsSync(`${csvDir}${line.trim()}`));
        } catch (error) {
            console.log(chalk.red('⚠ File csv_list.txt tidak ditemukan atau kosong. Menggunakan semua CSV di direktori data/.'));
            return fs.readdirSync(csvDir).filter(file => file.endsWith('.csv'));
        }
    }

    // Fungsi untuk memvalidasi jumlah token
    function validateAmount(amount) {
        const amountInt = Math.floor(parseFloat(amount)); // Bulatkan ke bawah
        if (isNaN(amountInt) || amountInt <= 0) {
            console.log(chalk.red('⚠ Jumlah token tidak valid! Harus bilangan bulat positif.'));
            return null;
        }
        if (amountInt > maxTokenLimit) {
            console.log(chalk.red(`⚠ Jumlah token melebihi batas maksimum ${maxTokenLimit.toLocaleString()}! Masukkan jumlah yang lebih kecil.`));
            return null;
        }
        return amountInt;
    }

    // Fungsi untuk memvalidasi jumlah address
    function validateAddressCount(count, total) {
        const countInt = Math.floor(parseFloat(count));
        if (isNaN(countInt) || countInt <= 0) {
            console.log(chalk.red('⚠ Jumlah address tidak valid! Harus bilangan bulat positif.'));
            return null;
        }
        if (countInt > total) {
            console.log(chalk.red(`⚠ Jumlah address melebihi total (${total})! Masukkan jumlah yang lebih kecil.`));
            return null;
        }
        return countInt;
    }

    // Fungsi untuk auto-claim faucet
    async function autoClaimFaucet() {
        try {
            const userAgents = [
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Safari/605.1.15',
                'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36'
            ];
            const randomUA = userAgents[Math.floor(Math.random() * userAgents.length)];

            console.log(chalk.yellow(`🚀 Mengklaim faucet Tea Sepolia untuk ${senderAddress}...`));
            logToFile(`Memulai auto-claim faucet Tea Sepolia untuk ${senderAddress}`);

            const response = await axios.post(faucetUrl, {
                address: senderAddress
            }, {
                headers: { 
                    'Content-Type': 'application/json',
                    'User-Agent': randomUA
                }
            });

            if (response.status === 200) {
                console.log(chalk.green('✅ Berhasil mengklaim faucet! Periksa wallet Anda.'));
                logToFile(`Berhasil mengklaim faucet untuk ${senderAddress}`);
                return true;
            } else {
                console.log(chalk.red(`⚠ Gagal mengklaim faucet: ${response.data.message || 'Unknown error'}`));
                logToFile(`Gagal mengklaim faucet: ${response.data.message || 'Unknown error'}`);
                return false;
            }
        } catch (error) {
            console.log(chalk.red(`⚠ Error saat mengklaim faucet: ${error.message}`));
            logToFile(`Error saat mengklaim faucet: ${error.message}`);
            return false;
        }
    }

    // Fungsi untuk memilih token dan mode
    async function chooseTokenAndMode() {
        displayHeader();
        console.log(chalk.bold.rgb(0, 255, 255)(`
   ┌─────────────────────────────┐
   │ 🌟 MODE PENGIRIMAN TOKEN 🌟 │
   └─────────────────────────────┘
`));
        console.log(chalk.rgb(255, 215, 0)('   1️⃣ Dari file CSV'));
        console.log(chalk.rgb(255, 215, 0)('   2️⃣ Pilih token manual + masukkan penerima'));
        console.log(chalk.rgb(255, 215, 0)('   3️⃣ Pilih token & CSV + jumlah manual'));
        console.log(chalk.rgb(255, 215, 0)('   4️⃣ Masukkan alamat token + jumlah'));
        console.log(chalk.rgb(255, 215, 0)('   5️⃣ Claim Faucet'));
        console.log(chalk.rgb(255, 215, 0)('   6️⃣ Keluar'));
        console.log(chalk.rgb(0, 255, 255)('   ─────────────────────────────'));

        return new Promise((resolve) => {
            rl.question(chalk.green('➤ Pilih (1-6): '), async (choice) => {
                if (choice === '6') {
                    console.log(chalk.blue('🚪 Keluar dari program. Sampai jumpa!'));
                    rl.close();
                    process.exit(0);
                }
                if (choice === '5') {
                    resolve({ mode: 'faucet' });
                } else if (choice === '1') {
                    resolve({ mode: 'csv', address: process.env.TOKEN_ADDRESS, csvPath: defaultCsvFilePath, manualAmount: null });
                } else if (choice === '2') {
                    console.log(chalk.yellow('\n📜 Daftar Token Tersedia:'));
                    tokenList.forEach((token, index) => {
                        console.log(chalk.cyan(`   ${index + 1}. ${token.name} (${token.address})`));
                    });
                    rl.question(chalk.green('➤ Pilih nomor token: '), async (tokenChoice) => {
                        const selectedToken = tokenList[parseInt(tokenChoice) - 1];
                        if (!selectedToken) {
                            console.log(chalk.red('⚠ Pilihan tidak valid!'));
                            resolve(await chooseTokenAndMode());
                        }
                        const recipients = [];
                        console.log(chalk.yellow('\n✏ Masukkan penerima (kosongkan untuk selesai):'));
                        while (true) {
                            const recipient = await new Promise(resolve => {
                                rl.question(chalk.green('   Alamat penerima: '), resolve);
                            });
                            if (!recipient) break;
                            const amount = await new Promise(resolve => {
                                rl.question(chalk.green(`   Jumlah token (maks ${maxTokenLimit.toLocaleString()}): `), resolve);
                            });
                            const amountInt = validateAmount(amount);
                            if (amountInt === null) continue;
                            recipients.push({ address: recipient, amount: amountInt });
                        }
                        resolve({ mode: 'manual', address: selectedToken.address, csvPath: null, manualAmount: null, recipients });
                    });
                } else if (choice === '3' || choice === '4') {
                    let tokenAddress;
                    if (choice === '3') {
                        console.log(chalk.yellow('\n📜 Daftar Token Tersedia:'));
                        tokenList.forEach((token, index) => {
                            console.log(chalk.cyan(`   ${index + 1}. ${token.name} (${token.address})`));
                        });
                        tokenAddress = await new Promise(resolve => {
                            rl.question(chalk.green('➤ Pilih nomor token: '), (tokenChoice) => {
                                const selectedToken = tokenList[parseInt(tokenChoice) - 1];
                                resolve(selectedToken ? selectedToken.address : null);
                            });
                        });
                        if (!tokenAddress) {
                            console.log(chalk.red('⚠ Pilihan tidak valid!'));
                            resolve(await chooseTokenAndMode());
                        }
                    } else {
                        tokenAddress = await new Promise(resolve => {
                            rl.question(chalk.green('➤ Masukkan alamat token: '), resolve);
                        });
                    }

                    const csvFiles = getCsvList();
                    if (csvFiles.length === 0) {
                        console.log(chalk.red('⚠ Tidak ada file CSV yang tersedia!'));
                        resolve(await chooseTokenAndMode());
                    }
                    console.log(chalk.yellow('\n📂 Daftar File CSV Tersedia:'));
                    csvFiles.forEach((file, index) => {
                        console.log(chalk.cyan(`   ${index + 1}. ${file}`));
                    });
                    rl.question(chalk.green('➤ Pilih nomor file CSV: '), async (csvChoice) => {
                        const selectedCsv = csvFiles[parseInt(csvChoice) - 1];
                        if (!selectedCsv) {
                            console.log(chalk.red('⚠ Pilihan tidak valid!'));
                            resolve(await chooseTokenAndMode());
                        }
                        const manualAmount = await new Promise(resolve => {
                            rl.question(chalk.green(`➤ Jumlah token untuk semua (maks ${maxTokenLimit.toLocaleString()}): `), resolve);
                        });
                        const amountInt = validateAmount(manualAmount);
                        if (amountInt === null) {
                            resolve(await chooseTokenAndMode());
                        }
                        logToFile(`Jumlah token yang dipilih: ${amountInt}`);
                        resolve({ mode: 'csv_custom_manual', address: tokenAddress, csvPath: `${csvDir}${selectedCsv}`, manualAmount: amountInt });
                    });
                } else {
                    console.log(chalk.red('⚠ Pilihan tidak valid!'));
                    resolve(await chooseTokenAndMode());
                }
            });
        });
    }

    // Fungsi untuk membaca CSV
    function readCSV(csvPath) {
        return new Promise((resolve, reject) => {
            const recipients = [];
            fs.createReadStream(csvPath)
                .pipe(csv())
                .on('data', (row) => recipients.push({ address: row.address, amount: null }))
                .on('end', () => resolve(recipients))
                .on('error', (error) => reject(error));
        });
    }

    // Fungsi untuk mengirim token
    async function sendToken(tokenContract, toAddress, amount, retries = 3) {
        let gasPrice = web3.utils.toWei(Math.floor(50 + Math.random() * 10).toString(), 'gwei'); // Gas acak 50-59 Gwei
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                const amountInt = Math.floor(amount); // Pastikan amount adalah bilangan bulat
                const tokenAmount = web3.utils.toWei(amountInt.toString(), 'ether'); // Konversi ke wei
                logToFile(`Mengirim ${amountInt} token ke ${toAddress} | Token Amount (wei): ${tokenAmount} | Percobaan ${attempt}`);

                console.log(chalk.rgb(255, 165, 0)(`🚀 Sending ${amountInt} tokens to ${toAddress}...`));

                const nonce = await web3.eth.getTransactionCount(senderAddress, 'pending');
                if (attempt > 1) {
                    gasPrice = web3.utils.toBN(gasPrice).mul(web3.utils.toBN('2')).toString();
                }
                const gasEstimate = await tokenContract.methods.transfer(toAddress, tokenAmount)
                    .estimateGas({ from: senderAddress });

                const txData = {
                    nonce: web3.utils.toHex(nonce),
                    to: tokenContract.options.address,
                    value: '0x0',
                    gasLimit: web3.utils.toHex(gasEstimate * 2),
                    gasPrice: web3.utils.toHex(gasPrice),
                    data: tokenContract.methods.transfer(toAddress, tokenAmount).encodeABI(),
                    chainId: chainId
                };

                const signedTx = await web3.eth.accounts.signTransaction(txData, privateKey);
                const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

                console.log(chalk.rgb(255, 165, 0)(`✔ Success: Sent ${amountInt} tokens to ${toAddress}`));
                await displayTxHashWithAnimation(receipt.transactionHash);
                logToFile(`Berhasil mengirim ${amountInt} token ke ${toAddress} | Tx Hash: ${receipt.transactionHash}`);

                return receipt.transactionHash;
            } catch (error) {
                let errorMessage;
                if (error.message.includes('replacement transaction underpriced')) {
                    errorMessage = `⚠ Transaksi sebelumnya masih tertunda. Gas ditingkatkan ke ${web3.utils.fromWei(gasPrice, 'gwei')} Gwei. (Percobaan ${attempt})`;
                } else if (error.message.includes('Invalid JSON RPC response')) {
                    errorMessage = `⚠ Koneksi ke jaringan gagal. Pastikan internet stabil. (Percobaan ${attempt})`;
                } else if (error.message.includes('insufficient funds')) {
                    errorMessage = `⚠ Saldo ETH tidak cukup untuk gas. (Percobaan ${attempt})`;
                } else {
                    errorMessage = `⚠ Ada masalah: ${error.message} (Percobaan ${attempt})`;
                }
                console.log(chalk.red(errorMessage));
                logToFile(`Error: ${error.message} | Gas Price: ${gasPrice} | Percobaan ${attempt}`);

                if (attempt === retries) {
                    console.log(chalk.red(`✖ Gagal setelah ${retries} percobaan. Cek explorer untuk transaksi tertunda.`));
                    return null;
                }
                await randomDelay(3000, 8000); // Jeda acak 3-8 detik sebelum retry
            }
        }
    }

    // Fungsi untuk memeriksa saldo
    async function checkBalance(tokenContract) {
        const balance = await tokenContract.methods.balanceOf(senderAddress).call();
        const balanceInTokens = web3.utils.fromWei(balance, 'ether');
        console.log(chalk.blue(`💰 Saldo Saat Ini: ${balanceInTokens} tokens`));
        logToFile(`Saldo token saat ini: ${balanceInTokens} token`);
        return balance;
    }

    // Fungsi untuk menampilkan menu kembali
    async function showReturnMenu() {
        return new Promise((resolve) => {
            console.log(chalk.bold.rgb(0, 255, 255)(`
   ┌────────────────────┐
   │ 🌟 MENU PILIHAN 🌟 │
   └────────────────────┘
`));
            console.log(chalk.rgb(255, 215, 0)('   1️⃣ Kembali ke Menu Utama'));
            console.log(chalk.rgb(255, 215, 0)('   2️⃣ Keluar'));
            console.log(chalk.rgb(0, 255, 255)('   ────────────────────'));
            rl.question(chalk.green('➤ Pilih (1-2): '), (choice) => {
                if (choice === '1') {
                    resolve(true);
                } else {
                    console.log(chalk.blue('🚪 Keluar dari program. Sampai jumpa!'));
                    rl.close();
                    process.exit(0);
                }
            });
        });
    }

    // Fungsi utama
    async function startAutoSender() {
        while (true) {
            const { mode, address, csvPath, manualAmount, recipients: manualRecipients } = await chooseTokenAndMode();

            if (mode === 'faucet') {
                await autoClaimFaucet();
                const returnToMenu = await showReturnMenu();
                if (!returnToMenu) break;
                continue;
            }

            const tokenContract = new web3.eth.Contract(tokenABI, address);

            displayHeader();
            console.log(chalk.yellow(`🌟 Token: ${address}`));
            if (csvPath) console.log(chalk.yellow(`📂 File CSV: ${csvPath}`));
            if (manualAmount) console.log(chalk.yellow(`💸 Jumlah per Penerima: ${manualAmount} tokens`));

            try {
                let recipients = manualRecipients || [];
                if (mode === 'csv' || mode === 'csv_custom_manual') {
                    recipients = await readCSV(csvPath);
                    if (recipients.length === 0) throw new Error('File CSV kosong atau tidak valid');
                    if (mode === 'csv_custom_manual') {
                        recipients = recipients.map(recipient => ({ ...recipient, amount: Math.floor(manualAmount) })); // Bulatkan manualAmount
                    }
                    console.log(chalk.yellow(`\n📊 Total Alamat di CSV: ${recipients.length}`));
                    const addressCount = await new Promise(resolve => {
                        rl.question(chalk.green(`➤ Berapa alamat yang akan dikirim (maks ${recipients.length}): `), resolve);
                    });
                    const validatedCount = validateAddressCount(addressCount, recipients.length);
                    if (validatedCount === null) {
                        await new Promise(resolve => rl.question(chalk.green('Tekan Enter untuk kembali ke menu...'), resolve));
                        continue;
                    }
                    recipients = shuffleArray(recipients.slice(0, validatedCount)); // Acak urutan penerima
                }

                const totalRecipients = recipients.length;
                const balance = await checkBalance(tokenContract);
                const totalNeeded = web3.utils.toWei((recipients.reduce((sum, r) => sum + Math.floor(r.amount), 0)).toString(), 'ether');
                logToFile(`Total kebutuhan token (wei): ${totalNeeded} | Saldo saat ini (wei): ${balance}`);
                if (web3.utils.toBN(balance).lt(web3.utils.toBN(totalNeeded))) {
                    console.log(chalk.red('⚠ Peringatan: Saldo mungkin tidak cukup untuk semua transaksi, tapi akan mencoba setiap penerima.'));
                    logToFile('Saldo token mungkin tidak cukup untuk semua transaksi, tetapi akan tetap mencoba setiap penerima');
                }

                displayHeader();
                console.log(chalk.yellow(`🚀 Memulai Pengiriman ke ${totalRecipients} Alamat...`));
                let successfulTx = 0;
                let failedTx = 0;

                for (const recipient of recipients) {
                    const currentBalance = await checkBalance(tokenContract);
                    const recipientAmount = web3.utils.toWei(Math.floor(recipient.amount).toString(), 'ether'); // Pastikan bilangan bulat
                    if (web3.utils.toBN(currentBalance).lt(web3.utils.toBN(recipientAmount))) {
                        console.log(chalk.red(`⚠ Saldo tidak cukup untuk ${recipient.address}. Melewati.`));
                        logToFile(`Saldo tidak cukup untuk ${recipient.address}. Melewati ke penerima berikutnya.`);
                        failedTx++;
                    } else {
                        const txHash = await sendToken(tokenContract, recipient.address, recipient.amount);
                        if (txHash) {
                            successfulTx++;
                            console.log(chalk.hex('# USGSB4')(`🎉 Progres: Terkirim ke ${successfulTx}/${totalRecipients} alamat`));
                            console.log(chalk.cyan('⏳ Jeda acak sebelum transaksi berikutnya...'));
                            await randomDelay(5000, 15000); // Jeda acak 5-15 detik
                        } else {
                            failedTx++;
                            console.log(chalk.cyan('⏳ Jeda acak meskipun gagal...'));
                            await randomDelay(5000, 15000); // Jeda acak 5-15 detik
                        }
                    }
                }

                console.log(chalk.green(`\n🎊 Pengiriman Selesai! Berhasil: ${successfulTx} | Gagal: ${failedTx}`));
                logToFile(`Pengiriman selesai! Berhasil: ${successfulTx}, Gagal: ${failedTx}`);

                const returnToMenu = await showReturnMenu();
                if (!returnToMenu) break;

            } catch (error) {
                console.log(chalk.red('⚠ Ada masalah saat menyiapkan pengiriman:'), error.message);
                logToFile(`Error dalam pengaturan pengiriman: ${error.message}`);
                const returnToMenu = await showReturnMenu();
                if (!returnToMenu) break;
            }
        }
    }

    // Jalankan script
    startAutoSender();
}

// Panggil fungsi untuk memuat modul dan memulai script
loadModules().catch(error => {
    console.error('Error loading modules:', error);
    process.exit(1);
});
