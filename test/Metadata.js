const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AirdropToken metadata", function () {
  it("onlyOwner seta URI e uri(id) retorna", async function () {
    const [owner, other] = await ethers.getSigners();
    const F = await ethers.getContractFactory("AirdropToken");
    const t = await F.deploy();
    await t.waitForDeployment();

    await t.setURI("ipfs://QmTest/{id}.json");
    expect(await t.uri(0)).to.equal("ipfs://QmTest/{id}.json");
    expect(await t.uri(1)).to.equal("ipfs://QmTest/{id}.json");

    await expect(t.connect(other).setURI("x"))
      .to.be.revertedWithCustomError(t, "OwnableUnauthorizedAccount");
  });
});
