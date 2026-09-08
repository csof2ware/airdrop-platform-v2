const { MerkleTree } = require("merkletreejs");
const { ethers } = require("hardhat");

// Hash de 1 argumento: compatível com merkletreejs E com o Solidity
const leafOf = (addr) => ethers.keccak256(addr);
const hashFn = (data) => ethers.keccak256(data);

async function main() {
  const [owner, alice, bob, carol] = await ethers.getSigners();
  const eligibleAddresses = [alice.address, bob.address, carol.address];

  console.log("Gerando Merkle Tree para", eligibleAddresses.length, "endereços...");

  const leaves = eligibleAddresses.map(leafOf);
  const tree = new MerkleTree(leaves, hashFn, { sortPairs: true });

  const root = tree.getHexRoot();
  console.log("Merkle Root:", root);

  const aliceProof = tree.getHexProof(leafOf(alice.address));
  console.log("Alice Proof:", aliceProof);
  console.log("Alice é elegível?", tree.verify(aliceProof, leafOf(alice.address), root));
}

main().catch((e) => { console.error(e); process.exit(1); });
