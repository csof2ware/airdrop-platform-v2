const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("EarlyAdopterNFT", function () {
  it("Deve mintar para o dono e bloquear estranhos", async function () {
    const EarlyAdopterNFT = await ethers.getContractFactory("EarlyAdopterNFT");
    const nft = await EarlyAdopterNFT.deploy();
    await nft.waitForDeployment();

    const [owner, stranger] = await ethers.getSigners();

    await nft.safeMint(owner.address);

    expect(await nft.balanceOf(owner.address)).to.equal(1);
    expect(await nft.ownerOf(0)).to.equal(owner.address);

    await expect(nft.connect(stranger).safeMint(stranger.address))
      .to.be.revertedWithCustomError(nft, "OwnableUnauthorizedAccount");
  });
});
