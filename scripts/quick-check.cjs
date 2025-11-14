#!/usr/bin/env node
const https = require('https');

const addr = "0x59A6751a1949CE99319301e7BE989ed273BD67be";
const url = `https://api-sepolia.etherscan.io/api?module=proxy&action=eth_getCode&address=${addr}&tag=latest&apikey=${process.env.ETHERSCAN_API_KEY}`;

https.get(url, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    const obj = JSON.parse(data);
    console.log('Address:', addr);
    console.log('Code length:', obj.result.length);
    console.log('Has code:', obj.result !== '0x');
    if (obj.result !== '0x' && obj.result.length > 100) {
      console.log('\n✅ Contract deployed successfully!');
      console.log('Etherscan:', `https://sepolia.etherscan.io/address/${addr}`);
    } else {
      console.log('\n⏳ Waiting for deployment to be visible...');
    }
  });
}).on('error', console.error);
