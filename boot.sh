#!/bin/sh
# ORDEM DE BOOT É CONTRATO: node -> setup -> worker/indexer -> server
echo "[1/4] hardhat node..."
npx hardhat node &
sleep 6
echo "[2/4] setup (deploy + config.json)..."
EXTRA="$EXTRA" npx hardhat run scripts/setupBackend.js --network localhost
echo "[3/4] worker + indexer..."
node backend/worker.js &
node backend/indexer.js &
echo "[4/4] api + dashboard..."
node backend/server.js
