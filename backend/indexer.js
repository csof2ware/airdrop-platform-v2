const { ethers } = require("ethers");
const fs = require("fs");
const db = require("./db");

const cfg = JSON.parse(fs.readFileSync("backend/config.json"));
const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
const abi = [
  "event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value)",
];
const token = new ethers.Contract(cfg.address, abi, provider);

async function main() {
  await db.initSchema();

  const last = await db.lastIndexedBlock();
  const latest = await provider.getBlockNumber();
  const events = await token.queryFilter("TransferSingle", last + 1, latest);
  for (const ev of events) {
    await db.ingestEvent(ev.transactionHash, ev.blockNumber, ev.args.to, Number(ev.args.value));
  }
  const stats = await db.getStats();
  console.log("Indexados " + events.length + " eventos novos | " + stats.holders + " holders no Postgres");

  token.on("TransferSingle", async function (operator, from, to, id, value, ev) {
    await db.ingestEvent(ev.transactionHash, ev.blockNumber, to, Number(value));
    console.log("+ holder no Postgres: " + to.slice(0, 10) + "...");
  });
  console.log("Indexer PG ao vivo...");
}
main().catch(function (e) { console.error(e); process.exit(1); });
