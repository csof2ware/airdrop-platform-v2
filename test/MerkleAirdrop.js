const { expect } = require("chai");
const { ethers } = require("hardhat");
const { MerkleTree } = require("merkletreejs");

const leafOf = (addr) => ethers.keccak256(addr);
const hashFn = (data) => ethers.keccak256(data);

describe("MerkleAirdrop", function () {
  let airdrop, owner, alice, bob, stranger;
  let aliceProof;

  beforeEach(async function () {
    [owner, alice, bob, stranger] = await ethers.getSigners();

    const leaves = [alice.address, bob.address].map(leafOf);
    const tree = new MerkleTree(leaves, hashFn, { sortPairs: true });
    const merkleRoot = tree.getHexRoot();
    aliceProof = tree.getHexProof(leafOf(alice.address));

    const MerkleAirdrop = await ethers.getContractFactory("MerkleAirdrop");
    airdrop = await MerkleAirdrop.deploy(merkleRoot);
    await airdrop.waitForDeployment();
  });

  it("Deve permitir claim com prova valida", async function () {
    await airdrop.connect(alice).claim(aliceProof);
    expect(await airdrop.balanceOf(alice.address, 0)).to.equal(1);
    expect(await airdrop.hasClaimed(alice.address)).to.be.true;
  });

  it("Deve bloquear duplo claim", async function () {
    await airdrop.connect(alice).claim(aliceProof);
    await expect(airdrop.connect(alice).claim(aliceProof)).to.be.revertedWith("Ja fez claim");
  });

  it("Deve bloquear quem nao esta na lista", async function () {
    const fakeProof = [leafOf(stranger.address)];
    await expect(airdrop.connect(stranger).claim(fakeProof)).to.be.revertedWith("Prova invalida");
  });
});
