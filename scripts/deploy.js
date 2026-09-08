const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Fazendo deploy com a conta:", deployer.address);

  const EarlyAdopterNFT = await hre.ethers.getContractFactory("EarlyAdopterNFT");
  const nft = await EarlyAdopterNFT.deploy();
  await nft.waitForDeployment();

  console.log("EarlyAdopterNFT lancado em:", await nft.getAddress());

  const mintTx = await nft.safeMint(deployer.address);
  await mintTx.wait();

  console.log("NFT mintado! Saldo:", await nft.balanceOf(deployer.address));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
