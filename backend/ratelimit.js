async function allow(redis, key, limit, windowMs) {
  const now = Date.now();
  const k = "rl:" + key;
  await redis.zremrangebyscore(k, 0, now - windowMs);
  const count = await redis.zcard(k);
  if (count >= limit) return false;
  await redis.zadd(k, now, now + ":" + Math.random());
  await redis.pexpire(k, windowMs);
  return true;
}

module.exports = { allow };
