
import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db/postgres";
import { getSession } from "@/lib/auth/session";
import { z } from "zod";
import { getCachedClassrooms, setCachedClassrooms, invalidateClassroomsCache } from "@/lib/cache/classrooms";

const classroomSchema = z.object({
  room_number: z.string().trim().min(1).max(20),
  building: z.string().trim().min(1).max(100),
  floor: z.number().int().min(0),
  capacity: z.number().int().positive(),
  facility_ids: z.array(z.number().int().positive()).default([]),
});

// GET: Fetch classrooms and their facilities
export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }

    if (session.role !== "ADMIN") {
      return NextResponse.json(
        { message: "Admin access required" },
        { status: 403 }
      );
    }

    const cachedClassrooms = await getCachedClassrooms();

    if (cachedClassrooms !== null) {
      return NextResponse.json({
        classrooms: cachedClassrooms,
        cache: "HIT"
      });
    }

    const result = await pool.query(`
      SELECT
        c.room_id,
        c.room_number,
        c.building,
        c.floor,
        c.capacity,
        COALESCE(
          json_agg(
            json_build_object(
              'facility_id', f.facility_id,
              'facility_name', f.facility_name
            )
          ) FILTER (WHERE f.facility_id IS NOT NULL),
          '[]'
        ) AS facilities
      FROM classrooms c
      LEFT JOIN classroom_facilities cf
        ON c.room_id = cf.room_id
      LEFT JOIN facilities f
        ON cf.facility_id = f.facility_id
      GROUP BY c.room_id
      ORDER BY c.building, c.room_number
    `);

    await setCachedClassrooms(result.rows);

    return NextResponse.json({
      classrooms: result.rows,
      cache: "MISS"
    });
  } catch (error) {
    console.error("Fetch classrooms error:", error);

    return NextResponse.json(
      { message: "Unable to fetch classrooms" },
      { status: 500 }
    );
  }
}

// POST: Add a classroom
export async function POST(request: NextRequest) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json(
      { message: "Authentication required" },
      { status: 401 }
    );
  }

  if (session.role !== "ADMIN") {
    return NextResponse.json(
      { message: "Admin access required" },
      { status: 403 }
    );
  }

  const client = await pool.connect();

  try {
    const body = await request.json();
    const validation = classroomSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { message: "Invalid classroom details", errors: validation.error.flatten() },
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

    const classroomResult = await client.query(
      `INSERT INTO classrooms
       (room_number, building, floor, capacity)
       VALUES ($1, $2, $3, $4)
       RETURNING room_id, room_number, building, floor, capacity`,
      [room_number, building, floor, capacity]
    );

    const classroom = classroomResult.rows[0];

    for (const facilityId of [...new Set(facility_ids)]) {
      await client.query(
        `INSERT INTO classroom_facilities (room_id, facility_id)
         VALUES ($1, $2)`,
        [classroom.room_id, facilityId]
      );
    }

    await client.query("COMMIT");
    await invalidateClassroomsCache();

    return NextResponse.json(
      { message: "Classroom created successfully", classroom },
      { status: 201 }
    );
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

    console.error("Create classroom error:", error);

    return NextResponse.json(
      { message: "Unable to create classroom" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
