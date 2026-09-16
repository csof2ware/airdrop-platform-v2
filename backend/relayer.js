require("dotenv").config();
const express = require("express");
const { ethers } = require("ethers");
const fs = require("fs");

const signed = JSON.parse(fs.readFileSync("backend/signed.json"));
const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
const RELAYER_KEY = process.env.RELAYER_KEY;
if (!RELAYER_KEY) { console.error("FATAL: RELAYER_KEY ausente"); process.exit(1); }
const relayer = new ethers.Wallet(RELAYER_KEY, provider);
const DEPLOYER_KEY = process.env.DEPLOYER_KEY;
const deployer = new ethers.Wallet(DEPLOYER_KEY, provider);

const contract = new ethers.Contract(signed.address, [
  "function claim(address claimant, uint256 amount, uint256 nonce, bytes sig)",
  "function batchClaim(address[] claimants, uint256[] amounts, uint256[] nonces, bytes[] sigs)",
  "function used(uint256) view returns (bool)",
  "function balanceOf(address, uint256) view returns (uint256)"
], relayer);

const domain = { name: "AirdropPlatform", version: "1", chainId: 31337, verifyingContract: signed.address };
const types = { Claim: [
  { name: "claimant", type: "address" },
  { name: "amount", type: "uint256" },
  { name: "nonce", type: "uint256" }
] };

async function ensureGas() {
  for (let i = 0; i < 30; i++) {
    try {
      const bal = await provider.getBalance(relayer.address);
      if (bal < ethers.parseEther("0.1")) {
        console.log("Relayer sem gas - financiando 1 ETH via deployer...");
        const tx = await deployer.sendTransaction({ to: relayer.address, value: ethers.parseEther("1") });
        const receipt = await tx.wait();
        console.log("Relayer financiado: " + receipt.hash.slice(0, 18));
      }
      console.log("Relayer pronto, balance: " + ethers.formatEther(await provider.getBalance(relayer.address)) + " ETH");
      return;
    } catch (e) {
      if (i === 29) throw new Error("RPC nao respondeu em 30 tentativas");
      process.stdout.write(".");
      await new Promise(function (r) { setTimeout(r, 1000); });
    }
  }
}

const app = express();
app.use(express.json());

app.post("/relay", async function (req, res) {
  const b = req.body;
  const value = { claimant: b.claimant, amount: b.amount, nonce: b.nonce };
  let recovered;
  try {
    recovered = ethers.verifyTypedData(domain, types, value, b.sig);
  } catch (e) {
    return res.status(400).json({ error: "sig malformada" });
  }
  if (recovered.toLowerCase() !== signed.authority.toLowerCase()) {
    return res.status(403).json({ error: "assinatura nao e da authority" });
  }
  if (await contract.used(b.nonce)) {
    return res.status(409).json({ error: "nonce ja usado (replay bloqueado)" });
  }
  try {
    const tx = await contract.claim(b.claimant, b.amount, b.nonce, b.sig);
    const receipt = await tx.wait();
    const balance = await contract.balanceOf(b.claimant, 0);
    console.log("Claim gasless minerada: " + receipt.hash.slice(0, 18) + " | saldo: " + balance);
    res.json({ txHash: receipt.hash, blockNumber: receipt.blockNumber, newBalance: balance.toString() });
  } catch (e) {
    res.status(500).json({ error: "tx revert: " + (e.reason || e.message) });
  }
});

app.post("/relay-batch", async function (req, res) {
  const claims = req.body.claims;
  if (!Array.isArray(claims) || claims.length === 0) {
    return res.status(400).json({ error: "claims deve ser array nao vazio" });
  }
  const claimants = [];
  const amounts = [];
  const nonces = [];
  const sigs = [];
  for (const claim of claims) {
    const value = { claimant: claim.claimant, amount: claim.amount, nonce: claim.nonce };
    let recovered;
    try {
      recovered = ethers.verifyTypedData(domain, types, value, claim.sig);
    } catch (e) {
      return res.status(400).json({ error: "sig malformada no nonce " + claim.nonce });
    }
    if (recovered.toLowerCase() !== signed.authority.toLowerCase()) {
      return res.status(403).json({ error: "assinatura invalida no nonce " + claim.nonce });
    }
    if (await contract.used(claim.nonce)) {
      return res.status(409).json({ error: "nonce " + claim.nonce + " ja usado" });
    }
    claimants.push(claim.claimant);
    amounts.push(claim.amount);
    nonces.push(claim.nonce);
    sigs.push(claim.sig);
  }
  try {
    console.log("Enviando batch de " + claims.length + " claims...");
    const tx = await contract.batchClaim(claimants, amounts, nonces, sigs);
    const receipt = await tx.wait();
    console.log("Batch minerado: " + receipt.hash.slice(0, 18) + " (" + claims.length + " claims)");
    res.json({
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      claimsProcessed: claims.length,
      gasUsed: receipt.gasUsed.toString()
    });
  } catch (e) {
    res.status(500).json({ error: "batch revert: " + (e.reason || e.message) });
  }
});

app.get("/health", async function (req, res) {
  res.json({ relayer: relayer.address, balance: (await provider.getBalance(relayer.address)).toString() });
});

ensureGas().then(function () {
  app.listen(3002, function () { console.log("Relayer gasless no ar: http://localhost:3002"); });
}).catch(function (e) { console.error("FATAL: " + e.message); process.exit(1); });
