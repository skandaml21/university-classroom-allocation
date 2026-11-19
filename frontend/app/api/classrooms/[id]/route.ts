
import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db/postgres";
import { getSession } from "@/lib/auth/session";
import { z } from "zod";
import { invalidateClassroomsCache } from "@/lib/cache/classrooms";

const classroomSchema = z.object({
  room_number: z.string().trim().min(1).max(20),
  building: z.string().trim().min(1).max(100),
  floor: z.number().int().min(0),
  capacity: z.number().int().positive(),
  facility_ids: z.array(z.number().int().positive()).default([]),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function checkAdmin() {
  const session = await getSession();

  if (!session) return 401;
  if (session.role !== "ADMIN") return 403;

  return 200;
}

// PUT: Update a classroom
export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  const status = await checkAdmin();

  if (status !== 200) {
    return NextResponse.json(
      { message: "Admin access required" },
      { status }
    );
  }

  const { id } = await context.params;
  const roomId = Number(id);

  if (!Number.isInteger(roomId) || roomId <= 0) {
    return NextResponse.json(
      { message: "Invalid classroom ID" },
      { status: 400 }
    );
  }

  const client = await pool.connect();

  try {
    const validation = classroomSchema.safeParse(await request.json());

    if (!validation.success) {
      return NextResponse.json(
        { message: "Invalid classroom details" },
        { status: 400 }
      );
    }

    const {
      room_number,
      building,
      floor,
      capacity,
      facility_ids,
    } = validation.data;

    await client.query("BEGIN");

    const result = await client.query(
      `UPDATE classrooms
       SET room_number = $1, building = $2, floor = $3, capacity = $4
       WHERE room_id = $5
       RETURNING room_id`,
      [room_number, building, floor, capacity, roomId]
    );

    if (result.rowCount === 0) {
      await client.query("ROLLBACK");

      return NextResponse.json(
        { message: "Classroom not found" },
        { status: 404 }
      );
    }

    await client.query(
      "DELETE FROM classroom_facilities WHERE room_id = $1",
      [roomId]
    );

    for (const facilityId of [...new Set(facility_ids)]) {
      await client.query(
        `INSERT INTO classroom_facilities (room_id, facility_id)
         VALUES ($1, $2)`,
        [roomId, facilityId]
      );
    }

    await client.query("COMMIT");
    await invalidateClassroomsCache();

    return NextResponse.json({
      message: "Classroom updated successfully",
    });
  } catch (error: unknown) {
    await client.query("ROLLBACK");

    const dbError = error as { code?: string };

    if (dbError.code === "23505") {
      return NextResponse.json(
        { message: "This room number already exists in this building." },
        { status: 409 }
      );
    }

    if (dbError.code === "23503") {
      return NextResponse.json(
        { message: "One or more selected facilities do not exist." },
        { status: 400 }
      );
    }

    if (dbError.code === "23514") {
      return NextResponse.json(
        { message: "The classroom details violate a database constraint." },
        { status: 400 }
      );
    }

    console.error("Update classroom error:", error);

    return NextResponse.json(
      { message: "Unable to update classroom" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

// DELETE: Delete a classroom
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  const status = await checkAdmin();

  if (status !== 200) {
    return NextResponse.json(
      { message: "Admin access required" },
      { status }
    );
  }

  const { id } = await context.params;
  const roomId = Number(id);

  if (!Number.isInteger(roomId) || roomId <= 0) {
    return NextResponse.json(
      { message: "Invalid classroom ID" },
      { status: 400 }
    );
  }

  try {
    const result = await pool.query(
      "DELETE FROM classrooms WHERE room_id = $1 RETURNING room_id",
      [roomId]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { message: "Classroom not found" },
        { status: 404 }
      );
    }

    await invalidateClassroomsCache();

    return NextResponse.json({
      message: "Classroom deleted successfully",
    });
  } catch (error: unknown) {
    const dbError = error as { code?: string };

    if (dbError.code === "23503") {
      return NextResponse.json(
        { message: "This classroom has existing allocations and cannot be deleted." },
        { status: 409 }
      );
    }

    console.error("Delete classroom error:", error);

    return NextResponse.json(
      { message: "Unable to delete classroom" },
      { status: 500 }
    );
  }
}
