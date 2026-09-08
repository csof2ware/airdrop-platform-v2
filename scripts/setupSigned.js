const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  const signers = await ethers.getSigners();
  const authority = signers[1];
  const F = await ethers.getContractFactory("SignedAirdrop");
  const c = await F.deploy(authority.address);
  await c.waitForDeployment();
  fs.writeFileSync("backend/signed.json", JSON.stringify({
    address: await c.getAddress(),
    authority: authority.address,
  }, null, 2));
  console.log("SignedAirdrop: " + (await c.getAddress()) + " | authority: " + authority.address);
}
main().catch(function (e) { console.error(e); process.exit(1); });
