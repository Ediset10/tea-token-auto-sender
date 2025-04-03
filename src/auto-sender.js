const Web3 = require('web3');
const fs = require('fs');
const csv = require('csv-parser');
require('dotenv').config();

const web3 = new Web3('https://tea-sepolia.g.alchemy.com/public');
const chainId = 10218;

const privateKey = process.env.PRIVATE_KEY;
if (!privateKey) {
    throw new Error('PRIVATE_KEY tidak ditemukan di file .env');
}
const account = web3.eth.accounts.privateKeyToAccount(privateKey);
const senderAddress = account.address;

const tokenAddress = process.env.TOKEN_ADDRESS;
if (!tokenAddress) {
    throw new Error('TOKEN_ADDRESS tidak ditemukan di file .env');
}

const tokenABI = [
    {"constant":false,"inputs":[{"name":"_to","type":"address"},{"name":"_value","type":"uint256"}],"name":"transfer","outputs":[{"name":"","type":"bool"}],"type":"function"},
    {"constant":true,"inputs":[{"name":"_owner","type":"address"}],"name":"balanceOf","outputs":[{"name":"balance","type":"uint256"}],"type":"function"}
];

const tokenContract = new web3.eth.Contract(tokenABI, tokenAddress);

const csvFilePath = 'data/recipients.csv';
const logFilePath = 'logs/transaction_log.txt';
const intervalMinutes = 5;
const decimals = 18;

function logToFile(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `${timestamp}: ${message}\n`;
    fs.appendFileSync(logFilePath, logMessage);
}

function readCSV() {
    return new Promise((resolve, reject) => {
        const recipients = [];
        fs.createReadStream(csvFilePath)
            .pipe(csv())
            .on('data', (row) => {
                recipients.push({
                    address: row.address,
                    amount: parseFloat(row.amount)
                });
            })
            .on('end', () => resolve(recipients))
            .on('error', (error) => reject(error));
    });
}

async function sendToken(toAddress, amount) {
    try {
        const tokenAmount = web3.utils.toBN(amount * (10 ** decimals)).toString();
        const nonce = await web3.eth.getTransactionCount(senderAddress, 'pending');
        const gasPrice = await web3.eth.getGasPrice();
        const gasEstimate = await tokenContract.methods.transfer(toAddress, tokenAmount)
            .estimateGas({ from: senderAddress });

        const txData = {
            nonce: web3.utils.toHex(nonce),
            to: tokenAddress,
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
        console.error(errorMessage);
        logToFile(errorMessage);
        throw error;
    }
}

async function checkBalance() {
    const balance = await tokenContract.methods.balanceOf(senderAddress).call();
    const balanceInTokens = web3.utils.fromWei(balance, 'ether');
    console.log(`Saldo token saat ini: ${balanceInTokens} token`);
    logToFile(`Saldo token saat ini: ${balanceInTokens} token`);
    return balance;
}

async function startAutoSender() {
    const intervalMs = intervalMinutes * 60 * 1000;

    try {
        const recipients = await readCSV();
        if (recipients.length === 0) {
            throw new Error('File CSV kosong atau tidak valid');
        }

        const balance = await checkBalance();
        const totalNeeded = recipients.reduce((sum, r) => sum + (r.amount * (10 ** decimals)), 0);
        if (web3.utils.toBN(balance).lt(web3.utils.toBN(totalNeeded))) {
            const message = 'Saldo token tidak cukup untuk semua transaksi';
            console.error(message);
            logToFile(message);
            return;
        }

        async function sendBatch() {
            for (const recipient of recipients) {
                const currentBalance = await checkBalance();
                if (web3.utils.toBN(currentBalance).lt(web3.utils.toBN(recipient.amount * (10 ** decimals)))) {
                    const message = `Saldo tidak cukup untuk ${recipient.address}. Menghentikan batch.`;
                    console.error(message);
                    logToFile(message);
                    break;
                }
                await sendToken(recipient.address, recipient.amount);
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            const batchMessage = 'Batch selesai!';
            console.log(batchMessage);
            logToFile(batchMessage);
        }

        console.log('Memulai batch transaksi otomatis...');
        logToFile('Memulai batch transaksi otomatis...');
        await sendBatch();

        setInterval(async () => {
            console.log('Memulai batch transaksi otomatis berikutnya...');
            logToFile('Memulai batch transaksi otomatis berikutnya...');
            await sendBatch();
        }, intervalMs);

    } catch (error) {
        const errorMessage = `Error dalam auto sender: ${error.message}`;
        console.error(errorMessage);
        logToFile(errorMessage);
        process.exit(1);
    }
}

startAutoSender();
