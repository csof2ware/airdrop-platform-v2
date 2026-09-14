#!/bin/bash
set -e
cd "$(dirname "$0")"
EXTRA=${EXTRA:-0x36c2402Db92B35B2eDd07D017758102eaa905483}

echo "== [0] limpeza total (mata volumes velhos, incl. node_modules anonimo) =="
docker compose down -v || true
docker volume prune -f
docker compose build dev

echo "== [1] sobe base (SEM graph-node) =="
docker compose up -d dev redis postgres graph-postgres ipfs

echo "== [2] boot detached (hardhat+setup+worker+api), log em /tmp/boot.log =="
docker compose exec -d dev sh -c "cd /app && EXTRA=$EXTRA ./boot.sh > /tmp/boot.log 2>&1"

echo "== [3] espera RPC responder =="
for i in $(seq 1 60); do
  if curl -sf -X POST -H 'Content-Type: application/json' \
    --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
    http://localhost:8545 > /dev/null 2>&1; then echo "   RPC pronto (${i}s)"; break; fi
  if [ "$i" -eq 60 ]; then echo "FATAL: RPC nao subiu. Log:"; docker compose exec -T dev cat /tmp/boot.log; exit 1; fi
  sleep 1
done

echo "== [4] graph-node so AGORA (RPC vivo = genesis correto) =="
docker compose up -d graph-node
sleep 15

echo "== [5] enderecos frescos + create + deploy =="
LABEL=v$(date +%s)
docker compose exec -T dev sh -c "cd /app && node scripts/updateSubgraph.js && cd subgraph && (npx graph create --node http://graph-node:8020/ airdrop-v2 || true) && npx graph deploy --node http://graph-node:8020/ --ipfs http://ipfs:5001 --version-label $LABEL airdrop-v2"

echo "== [6] loadtest + tempo de indexacao =="
docker compose exec -T dev sh -c "cd /app && node backend/loadtest.js"
sleep 10

echo "== [7] prova final =="
docker compose exec -T dev sh -c "wget -qO- --post-data='{\"query\":\"{ indexingStatuses { subgraph synced health } }\"}' --header='Content-Type: application/json' http://graph-node:8030/graphql"
docker compose exec -T dev sh -c "wget -qO- --post-data='{\"query\":\"{ holders(first: 5) { id balance transferCount } }\"}' --header='Content-Type: application/json' http://graph-node:8000/subgraphs/name/airdrop-v2"
echo "== FIM. Log do boot: docker compose exec dev cat /tmp/boot.log =="
