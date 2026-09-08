const hre = require("hardhat");

async function main() {
  const [deployer, , a, b, c] = await hre.ethers.getSigners();
  const AirdropToken = await hre.ethers.getContractFactory("AirdropToken");
  const token = await AirdropToken.deploy();
  await token.waitForDeployment();
  console.log("AirdropToken em:", await token.getAddress());

  await (await token.mintBatch(deployer.address, [0, 1], [100, 50])).wait();
  console.log("Saldo EARLY_ADOPTER:", await token.balanceOf(deployer.address, 0));
  console.log("Saldo VIP:", await token.balanceOf(deployer.address, 1));

  await (await token.airdrop([a.address, b.address, c.address], 0, 7)).wait();
  console.log("Airdrop enviado para 3 carteiras em 1 unica transacao!");
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
