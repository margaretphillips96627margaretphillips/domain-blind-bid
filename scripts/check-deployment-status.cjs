#!/usr/bin/env node
const https = require('https');

const contractAddress = "0x7Ea81B59a59127661CfD79970291DD7834f4e2e8";
const apiKey = process.env.ETHERSCAN_API_KEY;

console.log("Checking deployment status on Etherscan...");
console.log("Contract:", contractAddress);
console.log("Etherscan:", `https://sepolia.etherscan.io/address/${contractAddress}`);

const url = `https://api-sepolia.etherscan.io/api?module=proxy&action=eth_getCode&address=${contractAddress}&tag=latest&apikey=${apiKey}`;

https.get(url, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    const result = JSON.parse(data);

    console.log("\n=== Deployment Status ===");
    if (result.result && result.result !== '0x') {
      console.log("✅ Contract is deployed!");
      console.log("Code length:", result.result.length, "characters");
      console.log("\n✅ You can now test creating an auction!");
      console.log("   Frontend URL: http://localhost:8080");
      console.log("\n📝 Next steps:");
      console.log("   1. Open http://localhost:8080");
      console.log("   2. Connect your wallet (0x53f8...4ebc)");
      console.log("   3. Go to Create Auction page");
      console.log("   4. Try creating a test auction!");
    } else {
      console.log("⏳ Contract not yet visible on Etherscan");
      console.log("   This is normal - please wait 1-2 minutes");
      console.log("   The contract was deployed in block 9530388");
    }
  });
}).on('error', (err) => {
  console.error("Error checking Etherscan:", err.message);
});
