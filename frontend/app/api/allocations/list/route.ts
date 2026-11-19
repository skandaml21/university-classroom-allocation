import { NextResponse } from "next/server";
import { pool } from "@/lib/db/postgres";
import { getSession } from "@/lib/auth/session";

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { message: "Please log in." },
        { status: 401 }
      );
    }

    if (session.role !== "ADMIN") {
      return NextResponse.json(
        { message: "Only administrators can view all allocations." },
        { status: 403 }
      );
    }

    const result = await pool.query(`
      SELECT
        allocation_id,
        day_of_week,
        course_code,
        course_name,
        faculty_name,
        room_number,
        building,
        capacity,
        expected_strength,
        start_time,
        end_time
      FROM classroom_timetable
      ORDER BY
        CASE day_of_week
          WHEN 'Monday' THEN 1
          WHEN 'Tuesday' THEN 2
          WHEN 'Wednesday' THEN 3
          WHEN 'Thursday' THEN 4
          WHEN 'Friday' THEN 5
          WHEN 'Saturday' THEN 6
        END,
        start_time,
        room_number
    `);

    return NextResponse.json({
      allocations: result.rows
    });
  } catch (error) {
    console.error("Allocation listing error:", error);

    return NextResponse.json(
      { message: "Unable to load allocations." },
      { status: 500 }
    );
  }
}
