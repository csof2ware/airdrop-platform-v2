const { ethers } = require("ethers");
const fs = require("fs");
const signed = JSON.parse(fs.readFileSync("backend/signed.json"));
const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");

async function main() {
  // Conta #2 do hardhat (o "usuário" que paga o gas)
  const claimant = new ethers.Wallet("0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a", provider);

  const r = await fetch("http://localhost:3000/voucher/" + claimant.address);
  const v = await r.json();
  console.log("voucher recebido:", JSON.stringify(v));

  const contract = new ethers.Contract(signed.address, [
    "function claim(address,uint256,uint256,bytes)",
    "function balanceOf(address,uint256) view returns (uint256)",
  ], claimant);

  const tx = await contract.claim(claimant.address, v.amount, v.nonce, v.signature);
  await tx.wait();
  console.log("claim minerado! balance:", (await contract.balanceOf(claimant.address, 0)).toString());
}
main().catch(function (e) { console.error(e); process.exit(1); });
