require('dotenv').config();
const ethers = require('ethers');

// Network Configuration
const provider = new ethers.JsonRpcProvider('https://rpc.soneium.org');

// WETH Contract Address
const WETH_ADDRESS = '0x4200000000000000000000000000000000000006';

// WETH ABI
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

const printHeader = () => {
    console.log("\x1b[32m═════════════════════════════════════════════");
    console.log("    Retrunvoid Soneium BOT - WETH Swap");
    console.log("═════════════════════════════════════════════\x1b[0m");
};

const printWalletInfo = async (wallet, walletNumber, amount, loops, delaySeconds) => {
    const ethBalance = await provider.getBalance(wallet.address);
    const wethContract = new ethers.Contract(WETH_ADDRESS, WETH_ABI, provider);
    const wethBalance = await wethContract.balanceOf(wallet.address);
    
    console.log(`\n\x1b[33m╔════ Wallet ${walletNumber} ════╗\x1b[0m`);
    console.log("\x1b[36m[WALLET INFO]");
    console.log(`Address    : ${wallet.address}`);
    console.log(`Parameters : ${amount} ETH per swap, ${loops} loops, ${delaySeconds}s delay`);
    console.log(`Balance    : ${ethers.formatEther(ethBalance)} ETH | ${ethers.formatEther(wethBalance)} WETH\x1b[0m`);
};

async function swapForWallet(walletNumber) {
    const privateKey = process.env[`PRIVATE_KEY_${walletNumber}`];
    const amount = parseFloat(process.env[`AMOUNT_${walletNumber}`]);
    const loops = parseInt(process.env[`LOOPS_${walletNumber}`]);
    const delaySeconds = parseInt(process.env[`DELAY_${walletNumber}`]);

    if (!privateKey) {
        throw new Error(`Configuration for wallet ${walletNumber} not found`);
    }

    const wallet = new ethers.Wallet(privateKey, provider);
    const wethContract = new ethers.Contract(WETH_ADDRESS, WETH_ABI, wallet);

    await printWalletInfo(wallet, walletNumber, amount, loops, delaySeconds);

    try {
        for(let i = 1; i <= loops; i++) {
            console.log(`\n\x1b[33m[LOOP ${i}/${loops}]\x1b[0m`);
            
            // Check balances before swap
            const ethBalance = await provider.getBalance(wallet.address);
            const wethBalance = await wethContract.balanceOf(wallet.address);
            console.log(`\x1b[34m[BALANCE] ETH: ${ethers.formatEther(ethBalance)} | WETH: ${ethers.formatEther(wethBalance)}\x1b[0m`);
            
            // ETH to WETH
            console.log(`\x1b[32m[SWAP] Depositing ${amount} ETH → WETH...\x1b[0m`);
            const amountIn = ethers.parseEther(amount.toString());
            const gasPrice = await provider.getFeeData();
            
            const tx1 = await wethContract.deposit({
                value: amountIn,
                gasPrice: gasPrice.gasPrice
            });
            
            console.log(`\x1b[32m[TX] ${tx1.hash}\x1b[0m`);
            await tx1.wait();
            
            await sleep(delaySeconds * 1000);
            
            // Get current WETH balance for full withdrawal
            const currentWethBalance = await wethContract.balanceOf(wallet.address);
            
            // WETH to ETH
            console.log(`\x1b[32m[SWAP] Withdrawing ${ethers.formatEther(currentWethBalance)} WETH → ETH...\x1b[0m`);
            const tx2 = await wethContract.withdraw(currentWethBalance, {
                gasPrice: gasPrice.gasPrice
            });
            
            console.log(`\x1b[32m[TX] ${tx2.hash}\x1b[0m`);
            await tx2.wait();
            
            // Final balance check
            const finalEthBalance = await provider.getBalance(wallet.address);
            console.log(`\x1b[34m[FINAL] ETH Balance: ${ethers.formatEther(finalEthBalance)}\x1b[0m`);
            
            if(i < loops) {
                console.log(`\x1b[36m[DELAY] Waiting ${delaySeconds}s before next loop...\x1b[0m`);
                await sleep(delaySeconds * 1000);
            }
        }
        
        console.log(`\x1b[32m[SUCCESS] Wallet ${walletNumber} operations completed!\x1b[0m`);
    } catch (error) {
        console.error(`\x1b[31m[ERROR] Wallet ${walletNumber}:`, error.message, '\x1b[0m');
    }
}

async function startMultiWalletSwaps() {
    try {
        printHeader();
        
        const wallets = [];
        let walletNum = 1;
        
        while (process.env[`PRIVATE_KEY_${walletNum}`]) {
            wallets.push(walletNum);
            walletNum++;
        }
        
        console.log(`\x1b[36m[INFO] Starting operations for ${wallets.length} wallets...\x1b[0m`);
        
        await Promise.all(
            wallets.map(walletNum => swapForWallet(walletNum))
        );
        
        console.log('\n\x1b[32m[SUCCESS] All wallet operations completed!\x1b[0m');
    } catch (error) {
        console.error('\x1b[31m[FATAL ERROR]:', error.message, '\x1b[0m');
    }
}

startMultiWalletSwaps();
