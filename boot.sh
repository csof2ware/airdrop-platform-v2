#!/bin/sh
echo "[1/4] hardhat node..."
npx hardhat node --hostname 0.0.0.0 &
i=0
until wget -qO- --post-data='{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' --header='Content-Type: application/json' http://127.0.0.1:8545 >/dev/null 2>&1; do
  i=$((i+1))
  if [ $i -gt 30 ]; then echo "FATAL: hardhat nao subiu em 30s - veja erro acima"; exit 1; fi
  sleep 1
done
echo "   RPC pronto (${i}s)"
echo "[2/4] setup..."
npx hardhat run scripts/setupBackend.js --network localhost
npx hardhat run scripts/setupSigned.js --network localhost
echo "[3/4] worker + indexer..."
node backend/worker.js &
node backend/indexer.js &
echo "[4/4] api..."
node backend/server.js
