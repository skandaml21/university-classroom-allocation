import { redis } from "@/lib/cache/redis";

const CACHE_KEY = "classrooms:list:v1";
const CACHE_TTL = 60;

async function ensureRedisConnection() {
  if (redis.status === "wait") {
    await redis.connect();
  }
}

export async function getCachedClassrooms(): Promise<unknown[] | null> {
  try {
    await ensureRedisConnection();

    const cached = await redis.get(CACHE_KEY);

    if (!cached) return null;

    return JSON.parse(cached) as unknown[];
  } catch (error) {
    console.error("Redis classroom cache read failed:", error);
    return null;
  }
}

export async function setCachedClassrooms(
  classrooms: unknown[]
): Promise<void> {
  try {
    await ensureRedisConnection();

    await redis.set(
      CACHE_KEY,
      JSON.stringify(classrooms),
      "EX",
      CACHE_TTL
    );
  } catch (error) {
    console.error("Redis classroom cache write failed:", error);
  }
}

export async function invalidateClassroomsCache(): Promise<void> {
  try {
    await ensureRedisConnection();
    await redis.del(CACHE_KEY);
  } catch (error) {
    console.error("Redis classroom cache invalidation failed:", error);
  }
}
