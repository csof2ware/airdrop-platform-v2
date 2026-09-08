const { ethers } = require("ethers");

const RPCS = {
  amoy: [
    "https://polygon-amoy-bor-rpc.publicnode.com",
    "https://rpc-amoy.polygon.technology",
    "https://polygon-amoy.gateway.tenderly.co",
  ],
};

function timeout(ms) {
  return new Promise(function (_, rej) { setTimeout(rej, ms); });
}

async function healthCheck(url) {
  const p = new ethers.JsonRpcProvider(url);
  const t0 = Date.now();
  await Promise.race([p.getBlockNumber(), timeout(5000)]);
  return { url: url, latency: Date.now() - t0 };
}

// Testa todos em paralelo e escolhe o mais rápido que estiver vivo
async function bestRpc(network) {
  const results = await Promise.allSettled(RPCS[network].map(healthCheck));
  const alive = results
    .filter(function (r) { return r.status === "fulfilled"; })
    .map(function (r) { return r.value; });
  if (!alive.length) throw new Error("Todos os RPCs da lista estao mortos");
  alive.sort(function (a, b) { return a.latency - b.latency; });
  console.log("RPC escolhido: " + alive[0].url + " (" + alive[0].latency + "ms)");
  return new ethers.JsonRpcProvider(alive[0].url);
}

// Tenta em sequência; se um morrer, pula pro próximo
async function withFailover(network, fn) {
  for (const url of RPCS[network]) {
    try {
      return await fn(new ethers.JsonRpcProvider(url));
    } catch (e) {
      console.log("RPC falhou: " + url + " -> trocando...");
    }
  }
  throw new Error("Todos os RPCs falharam");
}

module.exports = { bestRpc, withFailover, RPCS };
