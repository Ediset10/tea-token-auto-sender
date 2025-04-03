// Fungsi untuk mengimpor modul secara dinamis
async function loadModules() {
    const Web3 = (await import('web3')).default;
    const fs = await import('fs');
    const csv = (await import('csv-parser')).default;
    const dotenv = (await import('dotenv')).default;
    const readline = await import('readline');

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

    // Daftar token manual (contoh)
    const tokenList = [
        { name: "TINU", address: "0xb2fe26E783f24E30EbDe2261928EC038dbf6478d" },
        { name: "Wen TGE", address: "0x3F2c9A99Af907591082E5962A7b39098d1249A43" }
    ];

    // ABI standar ERC-20
    const tokenABI = [
        {"constant":false,"inputs":[{"name":"_to","type":"address"},{"name":"_value","type":"uint256"}],"name":"transfer","outputs":[{"name":"","type":"bool"}],"type":"function"},
        {"constant":true,"inputs":[{"name":"_owner","type":"address"}],"name":"balanceOf","outputs":[{"name":"balance","type":"uint256"}],"type":"function"}
    ];

    // Konfigurasi
    const defaultCsvFilePath = 'data/recipients.csv';
    const csvListFile = 'data/csv_list.txt'; // File yang berisi daftar CSV
    const logFilePath = 'logs/transaction_log.txt';
    const intervalMinutes = 10;
    const decimals = 18;
    const csvDir = 'data/'; // Direktori untuk file CSV

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

    // Fungsi untuk tampilan header dengan ASCII "AGR"
    function displayHeader() {
        console.clear();
        console.log(`
   _____ ______   _______ 
  /     \\  __  \\ /  _____|
 /_______\\______/_______/ 
 |  *** TEA TOKEN SENDER ***  | 
 | Powered by ZUE - Tea Sepolia |
 ===============================
`);
    }

    // Fungsi untuk membaca daftar file CSV dari csv_list.txt
    function getCsvList() {
        try {
            const content = fs.readFileSync(csvListFile, 'utf8');
            return content.split('\n').filter(line => line.trim().endsWith('.csv') && fs.existsSync(`${csvDir}${line.trim()}`));
        } catch (error) {
            console.log('File csv_list.txt tidak ditemukan atau kosong. Menggunakan semua CSV di direktori data/.');
            return fs.readdirSync(csvDir).filter(file => file.endsWith('.csv'));
        }
    }

    // Fungsi untuk memilih token dan mode
    async function chooseTokenAndMode() {
        displayHeader();
        console.log('Pilih mode pengiriman token:');
        console.log('1. Dari file CSV default (data/recipients.csv)');
        console.log('2. Pilih token manual + masukkan penerima manual');
        console.log('3. Pilih token dan CSV dari daftar + jumlah manual');
        console.log('4. Masukkan alamat token manual + CSV dari daftar + jumlah manual');

        return new Promise((resolve) => {
            rl.question('Masukkan pilihan (1-4): ', async (choice) => {
                if (choice === '1') {
                    resolve({ mode: 'csv', address: process.env.TOKEN_ADDRESS, csvPath: defaultCsvFilePath, manualAmount: null });
                } else if (choice === '2') {
                    console.log('\nDaftar Token Tersedia:');
                    tokenList.forEach((token, index) => {
                        console.log(`${index + 1}. ${token.name} (${token.address})`);
                    });
                    rl.question('Pilih nomor token: ', (tokenChoice) => {
                        const selectedToken = tokenList[parseInt(tokenChoice) - 1];
                        if (selectedToken) {
                            resolve({ mode: 'manual', address: selectedToken.address, csvPath: null, manualAmount: null });
                        } else {
                            console.log('Pilihan tidak valid!');
                            process.exit(1);
                        }
                    });
                } else if (choice === '3' || choice === '4') {
                    let tokenAddress;
                    if (choice === '3') {
                        console.log('\nDaftar Token Tersedia:');
                        tokenList.forEach((token, index) => {
                            console.log(`${index + 1}. ${token.name} (${token.address})`);
                        });
                        tokenAddress = await new Promise(resolve => {
                            rl.question('Pilih nomor token: ', (tokenChoice) => {
                                const selectedToken = tokenList[parseInt(tokenChoice) - 1];
                                resolve(selectedToken ? selectedToken.address : null);
                            });
                        });
                        if (!tokenAddress) {
                            console.log('Pilihan tidak valid!');
                            process.exit(1);
                        }
                    } else {
                        tokenAddress = await new Promise(resolve => {
                            rl.question('Masukkan alamat token: ', resolve);
                        });
                    }

                    // Tampilkan daftar CSV dari csv_list.txt
                    const csvFiles = getCsvList();
                    if (csvFiles.length === 0) {
                        console.log('Tidak ada file CSV yang tersedia!');
                        process.exit(1);
                    }
                    console.log('\nDaftar File CSV Tersedia:');
                    csvFiles.forEach((file, index) => {
                        console.log(`${index + 1}. ${file}`);
                    });
                    rl.question('Pilih nomor file CSV: ', async (csvChoice) => {
                        const selectedCsv = csvFiles[parseInt(csvChoice) - 1];
                        if (selectedCsv) {
                            const manualAmount = await new Promise(resolve => {
                                rl.question('Masukkan jumlah token untuk semua penerima: ', resolve);
                            });
                            resolve({ mode: 'csv_custom_manual', address: tokenAddress, csvPath: `${csvDir}${selectedCsv}`, manualAmount: parseFloat(manualAmount) });
                        } else {
                            console.log('Pilihan tidak valid!');
                            process.exit(1);
                        }
                    });
                } else {
                    console.log('Pilihan tidak valid!');
                    process.exit(1);
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
                .on('data', (row) => recipients.push({ address: row.address, amount: null })) // Ignore amount dari CSV
                .on('end', () => resolve(recipients))
                .on('error', (error) => reject(error));
        });
    }

    // Fungsi untuk mengirim token
    async function sendToken(tokenContract, toAddress, amount) {
        try {
            const tokenAmount = web3.utils.toBN(amount * (10 ** decimals)).toString();
            const nonce = await web3.eth.getTransactionCount(senderAddress, 'pending');
            const gasPrice = await web3.eth.getGasPrice();
            const gasEstimate = await tokenContract.methods.transfer(toAddress, tokenAmount)
                .estimateGas({ from: senderAddress });

            const txData = {
                nonce: web3.utils.toHex(nonce),
                to: tokenContract.options.address,
                value: '0x0',
                gasLimit: web3.utils.toHex(gasEstimate),
                gasPrice: web3.utils.toHex(gasPrice),
                data: tokenContract.methods.transfer(toAddress, tokenAmount).encodeABI(),
                chainId: chainId
            };

            const signedTx = await web3.eth.accounts.signTransaction(txData, privateKey);
            const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

            const logMessage = `Berhasil mengirim ${amount} token ke ${toAddress} | Tx Hash: ${receipt.transactionHash}`;
            console.log(logMessage);
            logToFile(logMessage);

            return receipt.transactionHash;
        } catch (error) {
            const errorMessage = `Error mengirim ke ${toAddress}: ${error.message}`;
            console.log(errorMessage);
            logToFile(errorMessage);
            throw error;
        }
    }

    // Fungsi untuk memeriksa saldo
    async function checkBalance(tokenContract) {
        const balance = await tokenContract.methods.balanceOf(senderAddress).call();
        const balanceInTokens = web3.utils.fromWei(balance, 'ether');
        console.log(`Saldo token saat ini: ${balanceInTokens} token`);
        logToFile(`Saldo token saat ini: ${balanceInTokens} token`);
        return balance;
    }

    // Fungsi utama untuk auto send
    async function startAutoSender() {
        const intervalMs = intervalMinutes * 60 * 1000;

        // Pilih token dan mode
        const { mode, address, csvPath, manualAmount } = await chooseTokenAndMode();
        const tokenContract = new web3.eth.Contract(tokenABI, address);

        displayHeader();
        console.log(`Menggunakan token: ${address}`);
        if (csvPath) console.log(`Menggunakan CSV: ${csvPath}`);
        if (manualAmount) console.log(`Jumlah token manual: ${manualAmount}`);

        try {
            let recipients;
            if (mode === 'csv') {
                recipients = await readCSV(csvPath);
                if (recipients.length === 0) throw new Error('File CSV kosong atau tidak valid');
            } else if (mode === 'manual') {
                recipients = [];
                console.log('\nMasukkan penerima secara manual (kosongkan untuk selesai):');
                while (true) {
                    const recipient = await new Promise(resolve => {
                        rl.question('Alamat penerima: ', resolve);
                    });
                    if (!recipient) break;
                    const amount = await new Promise(resolve => {
                        rl.question('Jumlah token: ', resolve);
                    });
                    recipients.push({ address: recipient, amount: parseFloat(amount) });
                }
            } else if (mode === 'csv_custom_manual') {
                recipients = await readCSV(csvPath);
                if (recipients.length === 0) throw new Error('File CSV kosong atau tidak valid');
                recipients = recipients.map(recipient => ({ ...recipient, amount: manualAmount }));
            }

            const balance = await checkBalance(tokenContract);
            const totalNeeded = recipients.reduce((sum, r) => sum + (r.amount * (10 ** decimals)), 0);
            if (web3.utils.toBN(balance).lt(web3.utils.toBN(totalNeeded))) {
                console.log('Saldo token tidak cukup untuk semua transaksi');
                logToFile('Saldo token tidak cukup untuk semua transaksi');
                rl.close();
                return;
            }

            async function sendBatch() {
                displayHeader();
                console.log(`Memulai batch transaksi otomatis...`);
                for (const recipient of recipients) {
                    const currentBalance = await checkBalance(tokenContract);
                    if (web3.utils.toBN(currentBalance).lt(web3.utils.toBN(recipient.amount * (10 ** decimals)))) {
                        console.log(`Saldo tidak cukup untuk ${recipient.address}. Menghentikan batch.`);
                        logToFile(`Saldo tidak cukup untuk ${recipient.address}. Menghentikan batch.`);
                        break;
                    }
                    await sendToken(tokenContract, recipient.address, recipient.amount);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
                console.log('Batch selesai!');
                logToFile('Batch selesai!');
            }

            await sendBatch();
            setInterval(sendBatch, intervalMs);

        } catch (error) {
            console.log('Error dalam auto sender:', error.message);
            logToFile(`Error dalam auto sender: ${error.message}`);
            rl.close();
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
