const { ethers } = require('ethers');

async function main() {
  const rpcUrl = process.env.SEPOLIA_RPC_URL;
  const provider = new ethers.JsonRpcProvider(rpcUrl);

  const txHash = "0x8192f6a3ef38dffe5dca98e4c33955ca9cc41c52873e0e03d6c8624d18b4fa83";

  console.log("Fetching transaction...");
  const tx = await provider.getTransaction(txHash);

  if (!tx) {
    console.log("Transaction not found!");
    return;
  }

  console.log("\n=== Transaction Data ===");
  console.log("From:", tx.from);
  console.log("To:", tx.to);
  console.log("Value:", ethers.formatEther(tx.value), "ETH");
  console.log("Gas Limit:", tx.gasLimit.toString());
  console.log("Data:", tx.data);
  console.log("Data length:", tx.data ? tx.data.length : 0);
  console.log("Function selector:", tx.data ? tx.data.slice(0, 10) : "N/A");

  // Get receipt
  const receipt = await provider.getTransactionReceipt(txHash);
  console.log("\n=== Receipt ===");
  console.log("Status:", receipt.status === 1 ? "Success" : "Failed");
  console.log("Gas Used:", receipt.gasUsed.toString());
  console.log("Block:", receipt.blockNumber);
}

main().catch(console.error);
