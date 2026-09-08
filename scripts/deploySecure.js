const hre = require("hardhat");
const { ethers } = require("hardhat");
const { MerkleTree } = require("merkletreejs");

const leafOf = (addr) => ethers.keccak256(addr);
const hashFn = (data) => ethers.keccak256(data);

async function main() {
  const [deployer, alice, bob] = await hre.ethers.getSigners();

  const MockERC20 = await hre.ethers.getContractFactory("MockERC20");
  const gate = await MockERC20.deploy();
  await gate.waitForDeployment();
  await (await gate.mint(alice.address, 100)).wait();
  await (await gate.mint(bob.address, 100)).wait();

  const tree = new MerkleTree([alice.address, bob.address].map(leafOf), hashFn, { sortPairs: true });

  const SecureAirdrop = await hre.ethers.getContractFactory("SecureAirdrop");
  const airdrop = await SecureAirdrop.deploy(
    tree.getHexRoot(), await gate.getAddress(), 1, deployer.address
  );
  await airdrop.waitForDeployment();
  console.log("SecureAirdrop em:", await airdrop.getAddress());

  // "Backend" (deployer) assina o claim da Alice
  const net = await hre.ethers.provider.getNetwork();
  const domain = {
    name: "SecureAirdrop", version: "1",
    chainId: net.chainId, verifyingContract: await airdrop.getAddress(),
  };
  const types = { Claim: [
    { name: "account", type: "address" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ]};
  const deadline = (await hre.ethers.provider.getBlock("latest")).timestamp + 3600;

  const sig = await deployer.signTypedData(domain, types, { account: alice.address, nonce: 0, deadline });
  const proof = tree.getHexProof(leafOf(alice.address));

  await (await airdrop.connect(alice).claim(proof, deadline, sig)).wait();
  console.log("✅ Alice claimed! Saldo:", await airdrop.balanceOf(alice.address, 0));
}

main().catch((e) => { console.error(e); process.exit(1); });
