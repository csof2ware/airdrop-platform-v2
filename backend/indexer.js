const { ethers } = require("ethers");
const fs = require("fs");
const db = require("./db");

const cfg = JSON.parse(fs.readFileSync("backend/config.json"));
const signed = JSON.parse(fs.readFileSync("backend/signed.json"));
const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");

const abi = [
  "event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value)",
];

const merkleToken = new ethers.Contract(cfg.address, abi, provider);
const signedToken = new ethers.Contract(signed.address, abi, provider);

async function processEvents(contract, label) {
  const last = await db.lastIndexedBlock();
  const latest = await provider.getBlockNumber();
  const events = await contract.queryFilter("TransferSingle", last + 1, latest);
  for (const ev of events) {
    await db.ingestEvent(ev.transactionHash, ev.blockNumber, ev.args.to, Number(ev.args.value));
  }
  console.log(label + ": indexados " + events.length + " eventos historicos");

  contract.on("TransferSingle", async function (operator, from, to, id, value, ev) {
    await db.ingestEvent(ev.transactionHash, ev.blockNumber, to, Number(value));
    console.log("+ holder (" + label + "): " + to.slice(0, 10) + "... | value: " + value);
  });
}

async function main() {
  await db.initSchema();
  await processEvents(merkleToken, "Merkle (ERC20)");
  await processEvents(signedToken, "Signed (ERC1155)");
  const stats = await db.getStats();
  console.log("Total: " + stats.holders + " holders no Postgres");
  console.log("Indexer PG ao vivo (2 contratos)...");
}

main().catch(function (e) { console.error(e); process.exit(1); });
