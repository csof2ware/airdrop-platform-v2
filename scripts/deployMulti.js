const hre = require("hardhat");

const EXPLORERS = {
  sepolia: "https://sepolia.etherscan.io/address/",
  amoy: "https://amoy.polygonscan.com/address/",
  baseSepolia: "https://sepolia.basescan.org/address/",
};

async function main() {
  const networkName = hre.network.name;
  console.log("🌐 Rede:", networkName);

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("Saldo:", hre.ethers.formatEther(
    await hre.ethers.provider.getBalance(deployer.address)
  ));

  const AirdropToken = await hre.ethers.getContractFactory("AirdropToken");
  const token = await AirdropToken.deploy();
  await token.waitForDeployment();

  const address = await token.getAddress();
  console.log("✅ AirdropToken deployado em:", address);
  console.log("🔍 Explorer:", (EXPLORERS[networkName] || "rede local") + address);
}

main().catch((e) => { console.error(e); process.exit(1); });
