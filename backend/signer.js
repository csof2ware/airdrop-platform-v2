const express = require("express");
const Redis = require("ioredis");
const { ethers } = require("ethers");
const fs = require("fs");

const signed = JSON.parse(fs.readFileSync("backend/signed.json"));
const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
const AUTHORITY_KEY = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";
const authority = new ethers.Wallet(AUTHORITY_KEY, provider);
const redis = new Redis("redis://redis:6379");

const domain = {
  name: "AirdropPlatform",
  version: "1",
  chainId: 31337,
  verifyingContract: signed.address
};
const types = {
  Claim: [
    { name: "claimant", type: "address" },
    { name: "amount", type: "uint256" },
    { name: "nonce", type: "uint256" }
  ]
};

const app = express();
app.use(express.json());

app.get("/info", function (req, res) {
  res.json({ domain: domain, authority: authority.address, signedAddress: signed.address });
});

app.post("/sign", async function (req, res) {
  const claimant = req.body.claimant;
  const amount = req.body.amount || "1";
  if (!ethers.isAddress(claimant)) return res.status(400).json({ error: "claimant invalido" });
  const nonce = await redis.incr("signed-nonce");
  const value = { claimant: claimant, amount: amount, nonce: nonce };
  const sig = await authority.signTypedData(domain, types, value);
  console.log("Assinado nonce " + nonce + " para " + claimant.slice(0, 10));
  res.json({ claimant: claimant, amount: amount, nonce: nonce, sig: sig });
});

app.listen(3001, function () { console.log("Signer EIP-712 no ar: http://localhost:3001"); });
