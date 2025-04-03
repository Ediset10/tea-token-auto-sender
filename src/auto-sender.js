// Fungsi untuk mengimpor modul secara dinamis
async function loadModules() {
    const Web3 = (await import('web3')).default;
    const fs = await import('fs');
    const csv = (await import('csv-parser')).default;
    const chalk = (await import('chalk')).default;
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
        { name: "Token A", address: "0x3dF883079cA23C958e84783bF7AeF14756Dd0A82" },
        { name: "Token B", address: "0x79D086Ff0dd9Ca377d8938f111bb1c0a17Adac0D" },
        { name: "Token C", address: "0x3F2c9A99Af907591082E5962A7b39098d1249A43" }
    ];

    // ABI standar ERC-20
    const tokenABI = [
        {"constant":false,"inputs":[{"name":"_to","type":"address"},{"name":"_value","type":"uint256"}],"name":"transfer","outputs":[{"name":"","type":"bool"}],"type":"function"},
        {"constant":true,"inputs":[{"name":"_owner","type":"address"}],"name":"balanceOf","outputs":[{"name":"balance","type":"uint256"}],"type":"function"}
    ];

    // Konfigurasi
    const csvFilePath = 'data/recipients.csv';
    const logFilePath = 'logs/transaction_log.txt';
    const intervalMinutes = 10;
    const decimals = 18;

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

    // Fungsi untuk tampilan header keren
    function displayHeader() {
        console.clear();
        console.log(chalk.bgBlue.bold.white('========================================'));
        console.log(chalk.bgBlue.bold.white('   TEA TOKEN AUTO SENDER - POWERED BY ESH   '));
        console.log(chalk.bgBlue.bold.white('========================================'));
    }

    // Fungsi untuk memilih token
    async function chooseToken() {
        displayHeader();
        console.log(chalk.yellow('Pilih mode pengiriman token:'));
        console.log(chalk.cyan('1. Dari file CSV (data/recipients.csv)'));
        console.log(chalk.cyan('2. Pilih dari daftar token manual'));
        console.log(chalk.cyan('3. Masukkan alamat token secara manual'));

        return new Promise((resolve) => {
            rl.question(chalk.green('Masukkan pilihan (1-3): '), (choice) => {
                if (choice === '1') {
                    resolve({ mode: 'csv', address: process.env.TOKEN_ADDRESS });
                } else if (choice === '2') {
                    console.log(chalk.yellow('\nDaftar Token Tersedia:'));
                    tokenList.forEach((token, index) => {
                        console.log(chalk.cyan(`${index + 1}. ${token.name} (${token.address})`));
                    });
                    rl.question(chalk.green('Pilih nomor token: '), (tokenChoice) => {
                        const selectedToken = tokenList[parseInt(tokenChoice) - 1];
                        if (selectedToken) {
                            resolve({ mode: 'manual', address: selectedToken.address });
                        } else {
                            console.log(chalk.red('Pilihan tidak valid!'));
                            process.exit(1);
                        }
                    });
                } else if (choice === '3') {
                    rl.question(chalk.green('Masukkan alamat token: '), (address) => {
                        resolve({ mode: 'manual', address });
                    });
                } else {
                    console.log(chalk.red('Pilihan tidak valid!'));
                    process.exit(1);
                }
            });
        });
    }

    // Fungsi untuk membaca CSV
    function readCSV() {
        return new Promise((resolve, reject) => {
            const recipients = [];
            fs.createReadStream(csvFilePath)
                .pipe(csv())
                .on('data', (row) => recipients.push({ address: row.address, amount: parseFloat(row.amount) }))
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
            console.log(chalk.green(logMessage));
            logToFile(logMessage);

            return receipt.transactionHash;
        } catch (error) {
            const errorMessage = `Error mengirim ke ${toAddress}: ${error.message}`;
            console.log(chalk.red(errorMessage));
            logToFile(errorMessage);
            throw error;
        }
    }

    // Fungsi untuk memeriksa saldo
    async function checkBalance(tokenContract) {
        const balance = await tokenContract.methods.balanceOf(senderAddress).call();
        const balanceInTokens = web3.utils.fromWei(balance, 'ether');
        console.log(chalk.cyan(`Saldo token saat ini: ${balanceInTokens} token`));
        logToFile(`Saldo token saat ini: ${balanceInTokens} token`);
        return balance;
    }

    // Fungsi utama untuk auto send
    async function startAutoSender() {
        const intervalMs = intervalMinutes * 60 * 1000;

        // Pilih token
        const { mode, address } = await chooseToken();
        const tokenContract = new web3.eth.Contract(tokenABI, address);

        displayHeader();
        console.log(chalk.yellow(`Menggunakan token: ${address}`));

        try {
            let recipients;
            if (mode === 'csv') {
                recipients = await readCSV();
                if (recipients.length === 0) throw new Error('File CSV kosong atau tidak valid');
            } else {
                recipients = [];
                console.log(chalk.yellow('\nMasukkan penerima secara manual (kosongkan untuk selesai):'));
                while (true) {
                    const recipient = await new Promise(resolve => {
                        rl.question(chalk.green('Alamat penerima: '), resolve);
                    });
                    if (!recipient) break;
                    const amount = await new Promise(resolve => {
                        rl.question(chalk.green('Jumlah token: '), resolve);
                    });
                    recipients.push({ address: recipient, amount: parseFloat(amount) });
                }
            }

            const balance = await checkBalance(tokenContract);
            const totalNeeded = recipients.reduce((sum, r) => sum + (r.amount * (10 ** decimals)), 0);
            if (web3.utils.toBN(balance).lt(web3.utils.toBN(totalNeeded))) {
                console.log(chalk.red('Saldo token tidak cukup untuk semua transaksi'));
                logToFile('Saldo token tidak cukup untuk semua transaksi');
                rl.close();
                return;
            }

            async function sendBatch() {
                displayHeader();
                console.log(chalk.yellow(`Memulai batch transaksi otomatis...`));
                for (const recipient of recipients) {
                    const currentBalance = await checkBalance(tokenContract);
                    if (web3.utils.toBN(currentBalance).lt(web3.utils.toBN(recipient.amount * (10 ** decimals)))) {
                        console.log(chalk.red(`Saldo tidak cukup untuk ${recipient.address}. Menghentikan batch.`));
                        logToFile(`Saldo tidak cukup untuk ${recipient.address}. Menghentikan batch.`);
                        break;
                    }
                    await sendToken(tokenContract, recipient.address, recipient.amount);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
                console.log(chalk.green('Batch selesai!'));
                logToFile('Batch selesai!');
            }

            await sendBatch();
            setInterval(sendBatch, intervalMs);

        } catch (error) {
            console.log(chalk.red('Error dalam auto sender:', error.message));
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
