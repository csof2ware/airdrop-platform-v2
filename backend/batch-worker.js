const Redis = require("ioredis");

const redis = new Redis("redis://redis:6379");

const SIGNER_URL = "http://localhost:3001/sign-batch";
const RELAYER_URL = "http://localhost:3002/relay-batch";

const BATCH_SIZE = 5;
const BATCH_INTERVAL = 3000;

async function processBatch(batch) {
  console.log("Processando batch de " + batch.length + " claims...");

  const signRes = await fetch(SIGNER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ claims: batch })
  });
  const signedBatch = await signRes.json();

  const relayRes = await fetch(RELAYER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ claims: signedBatch.claims })
  });
  const result = await relayRes.json();

  if (result.txHash) {
    console.log("✓ Batch minerado: " + result.txHash.slice(0, 18) + " (" + result.claimsProcessed + " claims, gas: " + result.gasUsed + ")");
  } else {
    console.log("✗ Batch falhou: " + result.error);
  }
}

async function main() {
  console.log("Batch Worker iniciado - agrupando claims da fila 'claims'...");

  while (true) {
    const queueSize = await redis.llen("claims");

    if (queueSize === 0) {
      await new Promise(function (r) { setTimeout(r, 1000); });
      continue;
    }

    const batch = [];
    const startTime = Date.now();

    while (batch.length < BATCH_SIZE && (Date.now() - startTime) < BATCH_INTERVAL) {
      const item = await redis.blpop("claims", 1);
      if (item) {
        batch.push({ claimant: item[1], amount: "1" });
      }
    }

    if (batch.length === 0) continue;

    // Processa o batch COMPLETAMENTE antes de pegar o próximo
    await processBatch(batch);
    
    // Pequeno delay entre batches (evita race condition no nonce do relayer)
    await new Promise(function (r) { setTimeout(r, 500); });
  }
}

main().catch(function (e) { console.error(e); process.exit(1); });
