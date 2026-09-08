const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AirdropToken (ERC-1155)", function () {
  let token, owner, alice, bob;

  beforeEach(async function () {
    [owner, alice, bob] = await ethers.getSigners();
    const AirdropToken = await ethers.getContractFactory("AirdropToken");
    token = await AirdropToken.deploy();
    await token.waitForDeployment();
  });

  it("Deve mintar em lote (batch) para uma carteira", async function () {
    await token.mintBatch(alice.address, [0, 1], [10, 5]);
    expect(await token.balanceOf(alice.address, 0)).to.equal(10);
    expect(await token.balanceOf(alice.address, 1)).to.equal(5);
  });

  it("Deve fazer airdrop para varias carteiras em 1 tx", async function () {
    await token.airdrop([alice.address, bob.address], 0, 7);
    expect(await token.balanceOf(alice.address, 0)).to.equal(7);
    expect(await token.balanceOf(bob.address, 0)).to.equal(7);
  });

  it("Deve bloquear estranhos", async function () {
    await expect(token.connect(alice).mint(alice.address, 0, 1))
      .to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount");
  });
});
