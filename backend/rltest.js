const fs = require("fs");
const cfg = JSON.parse(fs.readFileSync("backend/config.json"));

async function main() {
  for (let i = 0; i < 8; i++) {
    const r = await fetch("http://127.0.0.1:3000/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: cfg.wallets[500], proof: cfg.proofs[500] }),
    });
    console.log("req " + i + " -> HTTP " + r.status);
  }
}
main();
