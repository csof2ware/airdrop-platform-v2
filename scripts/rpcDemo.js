const { bestRpc, withFailover } = require("../backend/rpc");

async function main() {
  const provider = await bestRpc("amoy");
  console.log("Bloco atual na Amoy:", await provider.getBlockNumber());

  const bloco = await withFailover("amoy", function (p) {
    return p.getBlockNumber();
  });
  console.log("Via withFailover:", bloco);
}
main().catch(function (e) { console.error(e); process.exit(1); });
