const { expect } = require("chai");
const { ethers } = require("hardhat");

function types() {
  return {
    Claim: [
      { name: "claimant", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "nonce", type: "uint256" },
    ],
  };
}

async function signVoucher(signer, contractAddr, chainId, claimant, amount, nonce) {
  const domain = { name: "AirdropPlatform", version: "1", chainId: chainId, verifyingContract: contractAddr };
  return signer.signTypedData(domain, types(), { claimant: claimant, amount: amount, nonce: nonce });
}

describe("SignedAirdrop EIP-712", function () {
  it("assinatura valida minta, replay morre, assinatura errada morre", async function () {
    const [owner, authority, user, attacker] = await ethers.getSigners();
    const F = await ethers.getContractFactory("SignedAirdrop");
    const c = await F.deploy(authority.address);
    await c.waitForDeployment();
    const addr = await c.getAddress();
    const chainId = Number((await ethers.provider.getNetwork()).chainId);

    const sig = await signVoucher(authority, addr, chainId, user.address, 1, 7);
    await c.connect(user).claim(user.address, 1, 7, sig);
    expect(await c.balanceOf(user.address, 0)).to.equal(1);

    await expect(c.connect(user).claim(user.address, 1, 7, sig))
      .to.be.revertedWith("nonce used");

    const badSig = await signVoucher(attacker, addr, chainId, user.address, 1, 8);
    await expect(c.connect(user).claim(user.address, 1, 8, badSig))
      .to.be.revertedWith("bad signature");
  });
});
