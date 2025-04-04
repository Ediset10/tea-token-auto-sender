// Fungsi untuk mengimpor modul secara dinamis
async function loadModules() {
    const Web3 = (await import('web3')).default;
    const fs = await import('fs');
    const csv = (await import('csv-parser')).default;
    const dotenv = (await import('dotenv')).default;
    const readline = await import('readline');
    const chalk = (await import('chalk')).default;

    // Konfigurasi dotenv
    dotenv.config();

    // Konfigurasi Tea Sepolia Testnet
    const primaryRpc = 'https://tea-sepolia.g.alchemy.com/public';
    const web3 = new Web3(primaryRpc);
    const chainId = 10218;

    // Informasi akun dari .env
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) throw new Error('PRIVATE_KEY tidak ditemukan di file .env');
    const account = web3.eth.accounts.privateKeyToAccount(privateKey);
    const senderAddress = account.address;

    // Daftar token manual (Ditambahkan Wen JP)
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
    const maxTokenLimit = 1000000000; // Batas maksimum 1 miliar token

    // Interface untuk input pengguna
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    // Fungsi untuk logging
    function logToFile(message) {
        const timestamp = new Date().toISOString();
        fs.appendFileSync(logFilePath, `${timestamp}: ${message}\n`);
    }

    // Fungsi untuk tampilan header
    function displayHeader() {
        console.clear();
        console.log(chalk.cyan.bold(`
   _____ ______   _______ 
  /     \\  __  \\ /  _____|
 /_______\\______/_______/ 
 |  *** TEA TOKEN SENDER ***  | 
 | Powered by ZUE - Tea Sepolia |
 ===============================
`));
    }

    // Fungsi untuk animasi Tx Hash
    async function displayTxHashWithAnimation(txHash) {
        const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
        let i = 0;
        for (let count = 0; count < 10; count++) {
            process.stdout.write(`\r${chalk.yellow('Memperbarui Tx Hash ' + frames[i % frames.length])}`);
            i++;
            await new Promise(resolve => setTimeout(resolve, 200)); // Delay 200ms per frame
        }
        process.stdout.write(`\r${chalk.green('Tx Hash: ' + txHash)}\n`); // Hijau
    }

    // Fungsi untuk membaca daftar file CSV dari csv_list.txt
    function getCsvList() {
        try {
            const content = fs.readFileSync(csvListFile, 'utf8');
            return content.split('\n').filter(line => line.trim().endsWith('.csv') && fs.existsSync(`${csvDir}${line.trim()}`));
        } catch (error) {
            console.log(chalk.red('File csv_list.txt tidak ditemukan atau kosong. Menggunakan semua CSV di direktori data/.'));
            return fs.readdirSync(csvDir).filter(file => file.endsWith('.csv'));
        }
    }

    // Fungsi untuk memvalidasi jumlah token
    function validateAmount(amount) {
        const amountInt = Math.floor(parseFloat(amount));
        if (isNaN(amountInt) || amountInt <= 0) {
            console.log(chalk.red('Jumlah token tidak valid! Harus bilangan bulat positif.'));
            return null;
        }
        if (amountInt > maxTokenLimit) {
            console.log(chalk.red(`Jumlah token melebihi batas maksimum ${maxTokenLimit.toLocaleString()}! Masukkan jumlah yang lebih kecil.`));
            return null;
        }
        return amountInt;
    }

    // Fungsi untuk memilih token dan mode
    async function chooseTokenAndMode() {
        displayHeader();
        console.log(chalk.yellow('Pilih mode pengiriman token:'));
        console.log('1. Dari file CSV');
        console.log('2. Pilih token manual + masukkan penerima manual');
        console.log('3. Pilih token dan CSV dari daftar + jumlah manual');
        console.log('4. Masukkan alamat token anda + jumalah ');
        console.log('5. Keluar');

        return new Promise((resolve) => {
            rl.question(chalk.green('Masukkan pilihan (1-5): '), async (choice) => {
                if (choice === '5') {
                    console.log(chalk.blue('Keluar dari program.'));
                    rl.close();
                    process.exit(0);
                }
                if (choice === '1') {
                    resolve({ mode: 'csv', address: process.env.TOKEN_ADDRESS, csvPath: defaultCsvFilePath, manualAmount: null });
                } else if (choice === '2') {
                    console.log(chalk.yellow('\nDaftar Token Tersedia:'));
                    tokenList.forEach((token, index) => {
                        console.log(`${index + 1}. ${token.name} (${token.address})`);
                    });
                    rl.question(chalk.green('Pilih nomor token: '), async (tokenChoice) => {
                        const selectedToken = tokenList[parseInt(tokenChoice) - 1];
                        if (!selectedToken) {
                            console.log(chalk.red('Pilihan tidak valid!'));
                            resolve(await chooseTokenAndMode()); // Kembali ke menu
                        }
                        const recipients = [];
                        console.log(chalk.yellow('\nMasukkan penerima secara manual (kosongkan untuk selesai):'));
                        while (true) {
                            const recipient = await new Promise(resolve => {
                                rl.question(chalk.green('Alamat penerima: '), resolve);
                            });
                            if (!recipient) break;
                            const amount = await new Promise(resolve => {
                                rl.question(chalk.green(`Jumlah token (maks ${maxTokenLimit.toLocaleString()}): `), resolve);
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
                        console.log(chalk.yellow('\nDaftar Token Tersedia:'));
                        tokenList.forEach((token, index) => {
                            console.log(`${index + 1}. ${token.name} (${token.address})`);
                        });
                        tokenAddress = await new Promise(resolve => {
                            rl.question(chalk.green('Pilih nomor token: '), (tokenChoice) => {
                                const selectedToken = tokenList[parseInt(tokenChoice) - 1];
                                resolve(selectedToken ? selectedToken.address : null);
                            });
                        });
                        if (!tokenAddress) {
                            console.log(chalk.red('Pilihan tidak valid!'));
                            resolve(await chooseTokenAndMode()); // Kembali ke menu
                        }
                    } else {
                        tokenAddress = await new Promise(resolve => {
                            rl.question(chalk.green('Masukkan alamat token: '), resolve);
                        });
                    }

                    const csvFiles = getCsvList();
                    if (csvFiles.length === 0) {
                        console.log(chalk.red('Tidak ada file CSV yang tersedia!'));
                        resolve(await chooseTokenAndMode()); // Kembali ke menu
                    }
                    console.log(chalk.yellow('\nDaftar File CSV Tersedia:'));
                    csvFiles.forEach((file, index) => {
                        console.log(`${index + 1}. ${file}`);
                    });
                    rl.question(chalk.green('Pilih nomor file CSV: '), async (csvChoice) => {
                        const selectedCsv = csvFiles[parseInt(csvChoice) - 1];
                        if (!selectedCsv) {
                            console.log(chalk.red('Pilihan tidak valid!'));
                            resolve(await chooseTokenAndMode()); // Kembali ke menu
                        }
                        const manualAmount = await new Promise(resolve => {
                            rl.question(chalk.green(`Masukkan jumlah token untuk semua penerima (maks ${maxTokenLimit.toLocaleString()}): `), resolve);
                        });
                        const amountInt = validateAmount(manualAmount);
                        if (amountInt === null) {
                            resolve(await chooseTokenAndMode()); // Kembali ke menu
                        }
                        logToFile(`Jumlah token yang dipilih: ${amountInt}`);
                        resolve({ mode: 'csv_custom_manual', address: tokenAddress, csvPath: `${csvDir}${selectedCsv}`, manualAmount: amountInt });
                    });
                } else {
                    console.log(chalk.red('Pilihan tidak valid!'));
                    resolve(await chooseTokenAndMode()); // Kembali ke menu
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
    async function sendToken(tokenContract, toAddress, amount) {
        try {
            const amountInt = Math.floor(amount);
            const tokenAmount = web3.utils.toWei(amountInt.toString(), 'ether');
            logToFile(`Mengirim ${amountInt} token ke ${toAddress} | Token Amount (wei): ${tokenAmount}`);

            const nonce = await web3.eth.getTransactionCount(senderAddress, 'pending');
            const gasPrice = await web3.eth.getGasPrice();
            const gasEstimate = await tokenContract.methods.transfer(toAddress, tokenAmount)
                .estimateGas({ from: senderAddress });

            const txData = {
                nonce: web3.utils.toHex(nonce),
                to: tokenContract.options.address,
                value: '0x0',
                gasLimit: web3.utils.toHex(gasEstimate + 10000),
                gasPrice: web3.utils.toHex(gasPrice),
                data: tokenContract.methods.transfer(toAddress, tokenAmount).encodeABI(),
                chainId: chainId
            };

            const signedTx = await web3.eth.accounts.signTransaction(txData, privateKey);
            const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

            const logMessage = `Berhasil mengirim ${amountInt} token ke ${toAddress}`;
            console.log(chalk.rgb(255, 165, 0)(logMessage)); // RGB (Orange)
            await displayTxHashWithAnimation(receipt.transactionHash);
            logToFile(`${logMessage} | Tx Hash: ${receipt.transactionHash}`);

            return receipt.transactionHash;
        } catch (error) {
            const errorMessage = `Error mengirim ${amount} token ke ${toAddress}: ${error.message}`;
            console.log(chalk.red(errorMessage));
            logToFile(errorMessage);
            return null; // Mengembalikan null agar transaksi berikutnya tetap berjalan
        }
    }

    // Fungsi untuk memeriksa saldo
    async function checkBalance(tokenContract) {
        const balance = await tokenContract.methods.balanceOf(senderAddress).call();
        const balanceInTokens = web3.utils.fromWei(balance, 'ether');
        console.log(chalk.blue(`Saldo token saat ini: ${balanceInTokens} token`)); // Biru
        logToFile(`Saldo token saat ini: ${balanceInTokens} token`);
        return balance;
    }

    // Fungsi untuk menampilkan menu kembali
    async function showReturnMenu() {
        return new Promise((resolve) => {
            console.log(chalk.yellow('\nPilih opsi:'));
            console.log('1. Kembali ke menu utama');
            console.log('2. Keluar');
            rl.question(chalk.green('Masukkan pilihan (1-2): '), (choice) => {
                if (choice === '1') {
                    resolve(true); // Kembali ke menu utama
                } else {
                    console.log(chalk.blue('Keluar dari program.'));
                    rl.close();
                    process.exit(0);
                }
            });
        });
    }

    // Fungsi utama untuk auto send
    async function startAutoSender() {
        while (true) { // Loop untuk kembali ke menu utama
            const { mode, address, csvPath, manualAmount, recipients: manualRecipients } = await chooseTokenAndMode();
            const tokenContract = new web3.eth.Contract(tokenABI, address);

            displayHeader();
            console.log(chalk.yellow(`Menggunakan token: ${address}`));
            if (csvPath) console.log(chalk.yellow(`Menggunakan CSV: ${csvPath}`));
            if (manualAmount) console.log(chalk.yellow(`Jumlah token manual: ${manualAmount}`));

            try {
                let recipients = manualRecipients || [];
                if (mode === 'csv') {
                    recipients = await readCSV(csvPath);
                    if (recipients.length === 0) throw new Error('File CSV kosong atau tidak valid');
                } else if (mode === 'csv_custom_manual') {
                    recipients = await readCSV(csvPath);
                    if (recipients.length === 0) throw new Error('File CSV kosong atau tidak valid');
                    recipients = recipients.map(recipient => ({ ...recipient, amount: manualAmount }));
                }

                const totalRecipients = recipients.length;
                const balance = await checkBalance(tokenContract);
                const totalNeeded = web3.utils.toWei((recipients.reduce((sum, r) => sum + r.amount, 0)).toString(), 'ether');
                logToFile(`Total kebutuhan token (wei): ${totalNeeded} | Saldo saat ini (wei): ${balance}`);
                if (web3.utils.toBN(balance).lt(web3.utils.toBN(totalNeeded))) {
                    console.log(chalk.red('Saldo token mungkin tidak cukup untuk semua transaksi, tetapi akan tetap mencoba setiap penerima'));
                    logToFile('Saldo token mungkin tidak cukup untuk semua transaksi, tetapi akan tetap mencoba setiap penerima');
                }

                displayHeader();
                console.log(chalk.yellow(`Memulai pengiriman transaksi ke ${totalRecipients} address...`));
                let successfulTx = 0;
                let failedTx = 0;

                for (const recipient of recipients) {
                    const currentBalance = await checkBalance(tokenContract);
                    const recipientAmount = web3.utils.toWei(recipient.amount.toString(), 'ether');
                    if (web3.utils.toBN(currentBalance).lt(web3.utils.toBN(recipientAmount))) {
                        console.log(chalk.red(`Saldo tidak cukup untuk ${recipient.address}. Melewati ke penerima berikutnya.`));
                        logToFile(`Saldo tidak cukup untuk ${recipient.address}. Melewati ke penerima berikutnya.`);
                        failedTx++;
                    } else {
                        const txHash = await sendToken(tokenContract, recipient.address, recipient.amount);
                        if (txHash) {
                            successfulTx++;
                            console.log(chalk.hex('#FF69B4')(`Sudah dikirim ke ${successfulTx}/${totalRecipients} address`)); // Pink
                        } else {
                            failedTx++;
                        }
                    }
                    await new Promise(resolve => setTimeout(resolve, 1000)); // Delay 1 detik seperti semula
                }

                console.log(chalk.green(`Pengiriman selesai! Berhasil: ${successfulTx}, Gagal: ${failedTx}`));
                logToFile(`Pengiriman selesai! Berhasil: ${successfulTx}, Gagal: ${failedTx}`);

                // Tampilkan menu kembali
                const returnToMenu = await showReturnMenu();
                if (!returnToMenu) break; // Keluar dari loop jika tidak kembali ke menu

            } catch (error) {
                console.log(chalk.red('Error dalam pengaturan pengiriman:'), error.message);
                logToFile(`Error dalam pengaturan pengiriman: ${error.message}`);

                // Tampilkan menu kembali meskipun ada error
                const returnToMenu = await showReturnMenu();
                if (!returnToMenu) break; // Keluar dari loop jika tidak kembali ke menu
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
