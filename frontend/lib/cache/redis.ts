
import Redis from "ioredis";

const globalForRedis = globalThis as unknown as {
  redisClient?: Redis;
};

export const redis =
  globalForRedis.redisClient ??
  new Redis({
    host: process.env.REDIS_HOST || "localhost",
    port: Number(process.env.REDIS_PORT || 6379),
    lazyConnect: true,
    maxRetriesPerRequest: 2,
  });

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redisClient = redis;
}
