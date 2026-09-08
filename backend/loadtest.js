const fs = require("fs");
const cfg = JSON.parse(fs.readFileSync("backend/config.json"));

const start = Date.now();

Promise.all(cfg.wallets.map(function (w, i) {
  return fetch("http://127.0.0.1:3000/claim", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address: w, proof: cfg.proofs[i] }),
  }).then(function (r) { return r.json(); });
})).then(function (results) {
  const queued = results.filter(function (r) { return r.status === "queued"; }).length;
  const ms = Date.now() - start;
  console.log(queued + "/1000 enfileirados em " + ms + "ms");
  console.log("Throughput da API: ~" + Math.round(1000 / (ms / 1000)) + " claims/seg");
});
