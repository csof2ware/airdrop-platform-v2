const hre = require("hardhat");
const { MerkleTree } = require("merkletreejs");
const { ethers } = require("hardhat");

async function main() {
  const [deployer, alice, bob, carol] = await hre.ethers.getSigners();

  // Gera a Merkle Tree (Alice, Bob, Carol são elegíveis)
  const eligibleAddresses = [alice.address, bob.address, carol.address];
  const leaves = eligibleAddresses.map((addr) =>
    ethers.solidityPackedKeccak256(["address"], [addr])
  );
  const tree = new MerkleTree(leaves, ethers.solidityPackedKeccak256, { sortPairs: true });
  const merkleRoot = tree.getHexRoot();

  console.log("Merkle Root:", merkleRoot);

  // Deploy
  const MerkleAirdrop = await hre.ethers.getContractFactory("MerkleAirdrop");
  const airdrop = await MerkleAirdrop.deploy(merkleRoot);
  await airdrop.waitForDeployment();

  console.log("MerkleAirdrop deployado em:", await airdrop.getAddress());

  // Gera a prova da Alice e testa o claim
  const aliceLeaf = ethers.solidityPackedKeccak256(["address"], [alice.address]);
  const aliceProof = tree.getHexProof(aliceLeaf);

  console.log("Alice fazendo claim...");
  const tx = await airdrop.connect(alice).claim(aliceProof);
  await tx.wait();

  console.log("✅ Alice recebeu o token!");
  console.log("Saldo da Alice:", await airdrop.balanceOf(alice.address, 0));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
