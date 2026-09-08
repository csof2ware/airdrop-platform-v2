const { expect } = require("chai");
const { ethers } = require("hardhat");
describe("ZKAirdrop", function () {
  it("nullifier previne double claim", async function () {
    const [owner, user] = await ethers.getSigners();
    const root = ethers.keccak256("0x1234");
    const F = await ethers.getContractFactory("ZKAirdrop");
    const c = await F.deploy(root);
    await c.waitForDeployment();
    const nullifier = ethers.keccak256(user.address);
    const proof = Array(8).fill(ethers.ZeroHash);
    await c.claim(nullifier, proof, user.address);
    expect(await c.balanceOf(user.address, 0)).to.equal(1);
    await expect(c.claim(nullifier, proof, user.address))
      .to.be.revertedWith("already claimed");
  });
});
