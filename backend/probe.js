const fs = require("fs");
const cfg = JSON.parse(fs.readFileSync("backend/config.json"));

async function main() {
  for (let i = 0; i < 3; i++) {
    const w = cfg.wallets[900 + i];
    const p = cfg.proofs[900 + i];
    const r = await fetch("http://127.0.0.1:3000/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: w, proof: p }),
    });
    const j = await r.json();
    console.log(i, "HTTP", r.status, JSON.stringify(j));
  }
}
main();
