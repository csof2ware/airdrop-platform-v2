const hre = require("hardhat");
const { MerkleTree } = require("merkletreejs");
const { ethers } = require("hardhat");

const leafOf = (addr) => ethers.keccak256(addr);
const hashFn = (data) => ethers.keccak256(data);

// Endereço do Biconomy Trusted Forwarder (testnet)
// Mainnet: 0x84a089C8E3c6E3F3F3F3F3F3F3F3F3F3F3F3F3F3
const BICONOMY_FORWARDER_AMOY = "0x0000000000333D84Fa97Bdf3A6e3f3F3F3F3F3F3"; // placeholder

async function main() {
  const [deployer, alice, bob] = await hre.ethers.getSigners();

  // Gera Merkle Tree
  const tree = new MerkleTree([alice.address, bob.address].map(leafOf), hashFn, { sortPairs: true });
  const merkleRoot = tree.getHexRoot();

  // Deploy com o forwarder do Biconomy
  const GaslessAirdrop = await hre.ethers.getContractFactory("GaslessAirdrop");
  const airdrop = await GaslessAirdrop.deploy(merkleRoot, BICONOMY_FORWARDER_AMOY);
  await airdrop.waitForDeployment();

  console.log("GaslessAirdrop em:", await airdrop.getAddress());
  console.log("Trusted Forwarder:", BICONOMY_FORWARDER_AMOY);
}

main().catch((e) => { console.error(e); process.exit(1); });
