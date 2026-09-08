const express = require("express");
const Redis = require("ioredis");
const { ethers } = require("ethers");
const fs = require("fs");
const db = require("./db");
const metrics = require("./metrics");
const rl = require("./ratelimit");

const cfg = JSON.parse(fs.readFileSync("backend/config.json"));
const redis = new Redis("redis://redis:6379");
const app = express();
app.use(express.json());
app.use(express.static("frontend"));

app.use(function (req, res, next) {
  metrics.inc("requests_total");
  next();
});

function leafOf(a) { return ethers.keccak256(a); }

function verifyProof(proof, leaf, root) {
  let computed = leaf;
  for (let i = 0; i < proof.length; i++) {
    const p = proof[i];
    if (BigInt(computed) <= BigInt(p)) {
      computed = ethers.keccak256(ethers.concat([computed, p]));
    } else {
      computed = ethers.keccak256(ethers.concat([p, computed]));
    }
  }
  return computed === root;
}

app.get("/config", function (req, res) {
  res.json({ airdropAddress: cfg.airdropAddress, root: cfg.root, signedAddress: signedCfg.address });
});

app.get("/proof/:address", function (req, res) {
  const addr = req.params.address.toLowerCase();
  const idx = cfg.wallets.findIndex(function (w) { return w.toLowerCase() === addr; });
  if (idx === -1) return res.status(404).json({ error: "nao elegivel" });
  res.json({ proof: cfg.proofs[idx] });
});

app.post("/claim", async function (req, res) {
  const address = req.body.address;
  const proof = req.body.proof;

  // Sliding window: máx 5 requests por 10s por endereço
  const okRl = await rl.allow(redis, address, 5, 10000);
  if (!okRl) {
    metrics.inc("claims_rate_limited");
    return res.status(429).json({ error: "rate limited" });
  }

  if (await redis.sismember("claimed", address)) {
    metrics.inc("claims_dup");
    return res.status(409).json({ error: "already claimed" });
  }

  const ok = verifyProof(proof, leafOf(address), cfg.root);
  if (!ok) {
    metrics.inc("claims_invalid");
    return res.status(403).json({ error: "not eligible" });
  }

  await redis.rpush("claims", address);
  await redis.sadd("claimed", address);
  metrics.inc("claims_queued");
  res.json({ status: "queued" });
});

app.get("/holders", async function (req, res) {
  try {
    res.json(await db.getHolders(100));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "banco indisponivel" });
  }
});

app.get("/holders/:address", async function (req, res) {
  const h = await db.getHolder(req.params.address);
  if (!h) return res.status(404).json({ error: "holder nao encontrado" });
  res.json(h);
});

app.get("/stats", async function (req, res) {
  res.json(await db.getStats());
});

// Healthcheck: orquestrador decide se reinicia o container
app.get("/health", async function (req, res) {
  const checks = {};
  try { await redis.ping(); checks.redis = "ok"; } catch (e) { checks.redis = "down"; }
  try { await db.getStats(); checks.postgres = "ok"; } catch (e) { checks.postgres = "down"; }
  try {
    const p = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
    await p.getBlockNumber();
    checks.rpc = "ok";
  } catch (e) { checks.rpc = "down"; }
  const healthy = checks.redis === "ok" && checks.postgres === "ok" && checks.rpc === "ok";
  res.status(healthy ? 200 : 503).json({ healthy: healthy, checks: checks });
});

// Métricas estilo Prometheus (sem dependências)
app.get("/metrics", async function (req, res) {
  const queue = await redis.llen("claims");
  res.set("Content-Type", "text/plain");
  res.send(metrics.render() + "\nairdrop_queue_length " + queue + "\n");
});

app.listen(3000, function () {
  console.log("API v4 no ar: http://localhost:3000");
});
