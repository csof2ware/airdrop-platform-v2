const { ethers } = require("ethers");
const Redis = require("ioredis");
const fs = require("fs");

const cfg = JSON.parse(fs.readFileSync("backend/config.json"));
const redis = new Redis("redis://redis:6379");

const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
const wallet = new ethers.Wallet(
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
  provider
);
const token = new ethers.Contract(
  cfg.address,
  ["function airdrop(address[] recipients, uint256 id, uint256 amount)"],
  wallet
);

const BATCH = 50;

async function main() {
  console.log("Worker iniciado - consumindo fila 'claims'...");
  while (true) {
    const item = await redis.blpop("claims", 0);
    const batch = [item[1]];

    while (batch.length < BATCH) {
      const next = await redis.lpop("claims");
      if (!next) break;
      batch.push(next);
    }

    console.log("Batch de " + batch.length + " claims -> 1 transacao on-chain");
    const tx = await token.airdrop(batch, 0, 1);
    await tx.wait();
    console.log("Batch minerado: " + tx.hash.slice(0, 18));
  }
}
main().catch(function (e) { console.error(e); process.exit(1); });
