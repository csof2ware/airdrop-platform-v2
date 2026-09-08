const hre = require("hardhat");
const fs = require("fs");

const IPFS_API = "http://ipfs:5001";

async function addFile(name, content, type) {
  const form = new FormData();
  form.append("file", new Blob([content], { type: type }), name);
  const res = await fetch(IPFS_API + "/api/v0/add", { method: "POST", body: form });
  const j = await res.json();
  return j.Hash;
}

async function addDir(files) {
  const form = new FormData();
  for (const f of files) {
    form.append("file", new Blob([f.content], { type: "application/json" }), f.name);
  }
  const res = await fetch(IPFS_API + "/api/v0/add?wrap-with-directory=true", { method: "POST", body: form });
  const text = await res.text();
  const lines = text.trim().split("\n").map(function (l) { return JSON.parse(l); });
  const dir = lines.find(function (e) { return e.Name === ""; });
  return dir.Hash;
}

function svgBadge(label, color) {
  return '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">' +
    '<rect width="200" height="200" fill="' + color + '"/>' +
    '<text x="100" y="110" font-size="24" fill="white" text-anchor="middle">' + label + '</text></svg>';
}

async function main() {
  const cfg = JSON.parse(fs.readFileSync("backend/config.json"));

  console.log("Upload das imagens SVG...");
  const img0 = await addFile("early.svg", svgBadge("EARLY", "#7c3aed"), "image/svg+xml");
  const img1 = await addFile("vip.svg", svgBadge("VIP", "#f59e0b"), "image/svg+xml");

  const metas = [
    { name: "Early Adopter", description: "Badge dos primeiros adotantes da plataforma", image: "ipfs://" + img0 },
    { name: "VIP", description: "Badge VIP da plataforma", image: "ipfs://" + img1 },
  ];

  console.log("Upload dos metadados (diretorio)...");
  const dirCid = await addDir([
    { name: "0.json", content: JSON.stringify(metas[0]) },
    { name: "1.json", content: JSON.stringify(metas[1]) },
  ]);

  const uri = "ipfs://" + dirCid + "/{id}.json";
  console.log("URI template: " + uri);

  const [deployer] = await hre.ethers.getSigners();
  const token = new hre.ethers.Contract(cfg.address, [
    "function setURI(string newuri)",
    "function uri(uint256 id) view returns (string)",
  ], deployer);

  await (await token.setURI(uri)).wait();
  console.log("setURI minerado!");
  console.log("uri(0) on-chain: " + (await token.uri(0)));
  console.log("Abra no navegador: http://localhost:8080/ipfs/" + dirCid + "/0.json");
}
main().catch(function (e) { console.error(e); process.exit(1); });
