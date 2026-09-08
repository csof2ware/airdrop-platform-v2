const hre = require("hardhat");
const { ethers } = require("hardhat");
const { MerkleTree } = require("merkletreejs");
const fs = require("fs");

const leafOf = (a) => ethers.keccak256(a);
const hashFn = (d) => ethers.keccak256(d);

async function main() {
  const wallets = [];
  for (let i = 0; i < 1000; i++) wallets.push(ethers.Wallet.createRandom().address);

  // Sua MetaMask entra na allowlist (passe via EXTRA=0x...)
  const extra = process.env.EXTRA;
  if (extra) wallets.push(ethers.getAddress(extra));

  const tree = new MerkleTree(wallets.map(leafOf), hashFn, { sortPairs: true });
  const root = tree.getHexRoot();

  const [deployer] = await ethers.getSigners();

  const AirdropToken = await ethers.getContractFactory("AirdropToken");
  const token = await AirdropToken.deploy();
  await token.waitForDeployment();

  const MerkleAirdrop = await ethers.getContractFactory("MerkleAirdrop");
  const airdrop = await MerkleAirdrop.deploy(root);
  await airdrop.waitForDeployment();

  if (extra) {
    await (await deployer.sendTransaction({
      to: ethers.getAddress(extra),
      value: ethers.parseEther("1"),
    })).wait();
    console.log("1 ETH de gas enviado para " + extra);
  }

  const proofs = wallets.map(function (w) { return tree.getHexProof(leafOf(w)); });

  fs.writeFileSync("backend/config.json", JSON.stringify({
    address: await token.getAddress(),
    airdropAddress: await airdrop.getAddress(),
    root: root,
    wallets: wallets,
    proofs: proofs,
  }, null, 2));
  console.log("config.json gerado (" + wallets.length + " elegiveis)");
}
main().catch(function (e) { console.error(e); process.exit(1); });
