
import { NextResponse } from "next/server";
import { pool } from "@/lib/db/postgres";
import { redis } from "@/lib/cache/redis";

export async function GET() {
  let postgresStatus = "disconnected";
  let redisStatus = "disconnected";

  try {
    await pool.query("SELECT 1");
    postgresStatus = "connected";
  } catch (error) {
    console.error("PostgreSQL health check failed:", error);
  }

  try {
    if (redis.status === "wait") {
      await redis.connect();
    }

    await redis.ping();
    redisStatus = "connected";
  } catch (error) {
    console.error("Redis health check failed:", error);
  }

  const healthy =
    postgresStatus === "connected" &&
    redisStatus === "connected";

  return NextResponse.json(
    {
      status: healthy ? "healthy" : "unhealthy",
      services: {
        postgres: postgresStatus,
        redis: redisStatus,
      },
    },
    { status: healthy ? 200 : 503 }
  );
}
