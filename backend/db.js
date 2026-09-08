const { Pool } = require("pg");

const pool = new Pool({
  host: "postgres",
  port: 5432,
  user: "airdrop",
  password: "airdrop",
  database: "airdrop",
});

async function initSchema() {
  await pool.query(
    "CREATE TABLE IF NOT EXISTS events (" +
    " id SERIAL PRIMARY KEY," +
    " tx_hash TEXT," +
    " block_number BIGINT," +
    " to_address TEXT," +
    " value BIGINT)"
  );
  await pool.query(
    "CREATE TABLE IF NOT EXISTS holders (" +
    " address TEXT PRIMARY KEY," +
    " balance BIGINT NOT NULL DEFAULT 0)"
  );
}

async function lastIndexedBlock() {
  const r = await pool.query("SELECT COALESCE(MAX(block_number), 0)::text AS b FROM events");
  return parseInt(r.rows[0].b, 10);
}

async function ingestEvent(txHash, blockNumber, to, value) {
  const addr = to.toLowerCase();
  await pool.query(
    "INSERT INTO events (tx_hash, block_number, to_address, value) VALUES ($1, $2, $3, $4)",
    [txHash, blockNumber, addr, value]
  );
  await pool.query(
    "INSERT INTO holders (address, balance) VALUES ($1, $2)" +
    " ON CONFLICT (address) DO UPDATE SET balance = holders.balance + $2",
    [addr, value]
  );
}

async function getHolders(limit) {
  const r = await pool.query(
    "SELECT address, balance::text FROM holders ORDER BY balance DESC LIMIT $1",
    [limit]
  );
  return r.rows;
}

async function getHolder(address) {
  const r = await pool.query(
    "SELECT address, balance::text FROM holders WHERE address = $1",
    [address.toLowerCase()]
  );
  return r.rows[0] || null;
}

async function getStats() {
  const h = await pool.query("SELECT COUNT(*)::text AS c, COALESCE(SUM(balance), 0)::text AS s FROM holders");
  const e = await pool.query("SELECT COALESCE(MAX(block_number), 0)::text AS b FROM events");
  return { holders: h.rows[0].c, totalMinted: h.rows[0].s, lastBlock: e.rows[0].b };
}

module.exports = { pool, initSchema, lastIndexedBlock, ingestEvent, getHolders, getHolder, getStats };
