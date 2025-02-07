require('dotenv').config();
const ethers = require('ethers');

// Konfigurasi Network Soneium
const provider = new ethers.JsonRpcProvider('https://rpc.soneium.org');

// Alamat kontrak WETH di Soneium
const WETH_ADDRESS = '0x4200000000000000000000000000000000000006';

// ABI WETH
const WETH_ABI = [
  {
    "inputs": [],
    "name": "deposit",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "wad",
        "type": "uint256"
      }
    ],
    "name": "withdraw",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "balanceOf",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function swapForWallet(walletNumber) {
    const privateKey = process.env[`PRIVATE_KEY_${walletNumber}`];
    const amount = parseFloat(process.env[`AMOUNT_${walletNumber}`]);
    const loops = parseInt(process.env[`LOOPS_${walletNumber}`]);
    const delaySeconds = parseInt(process.env[`DELAY_${walletNumber}`]);

    if (!privateKey) {
        throw new Error(`Configuration untuk wallet ${walletNumber} tidak ditemukan`);
    }

    const wallet = new ethers.Wallet(privateKey, provider);
    const wethContract = new ethers.Contract(WETH_ADDRESS, WETH_ABI, wallet);
    
    console.log(`\n=== BOT TX SWAP ETH - WETH + WETH - ETH ===`);
    console.log(`\n=== Wallet ${walletNumber} (${wallet.address}) Started ===`);
    console.log(`Amount: ${amount} ETH, Loops: ${loops}, Delay: ${delaySeconds}s`);
    console.log(`\n=== Pembuat : Retrunvoid ===`);
    console.log(`\n=== Github : https://github.com/retrunv0id ===`);


    try {
        for(let i = 1; i <= loops; i++) {
            console.log(`\n[Wallet ${walletNumber}] Loop ${i}/${loops}`);
            
            // Check balances
            const ethBalance = await provider.getBalance(wallet.address);
            const wethBalance = await wethContract.balanceOf(wallet.address);
            
            console.log(`[Wallet ${walletNumber}] Balances:`);
            console.log(`ETH: ${ethers.formatEther(ethBalance)}`);
            console.log(`WETH: ${ethers.formatEther(wethBalance)}`);
            
            // ETH to WETH
            console.log(`\n[Wallet ${walletNumber}] ETH → WETH`);
            const amountIn = ethers.parseEther(amount.toString());
            const gasPrice = await provider.getFeeData();
            
            const tx1 = await wethContract.deposit({
                value: amountIn,
                gasPrice: gasPrice.gasPrice
            });
            
            console.log(`[Wallet ${walletNumber}] TX Hash: ${tx1.hash}`);
            await tx1.wait();
            
            await sleep(delaySeconds * 1000);
            
            // WETH to ETH
            console.log(`\n[Wallet ${walletNumber}] WETH → ETH`);
            const tx2 = await wethContract.withdraw(amountIn, {
                gasPrice: gasPrice.gasPrice
            });
            
            console.log(`[Wallet ${walletNumber}] TX Hash: ${tx2.hash}`);
            await tx2.wait();
            
            if(i < loops) {
                console.log(`\n[Wallet ${walletNumber}] Waiting ${delaySeconds}s before next loop...`);
                await sleep(delaySeconds * 1000);
            }
        }
        
        console.log(`\n=== Wallet ${walletNumber} Completed ===`);
    } catch (error) {
        console.error(`\n[Wallet ${walletNumber}] Error:`, error);
    }
}

async function startMultiWalletSwaps() {
    try {
        // Mendeteksi jumlah wallet dari .env
        const wallets = [];
        let walletNum = 1;
        
        while (process.env[`PRIVATE_KEY_${walletNum}`]) {
            wallets.push(walletNum);
            walletNum++;
        }
        
        console.log(`Starting swaps for ${wallets.length} wallets...`);
        
        // Menjalankan semua wallet secara parallel
        await Promise.all(
            wallets.map(walletNum => swapForWallet(walletNum))
        );
        
        console.log('\nAll wallet operations completed!');
    } catch (error) {
        console.error('Fatal error:', error);
    }
}

// Jalankan script
startMultiWalletSwaps();