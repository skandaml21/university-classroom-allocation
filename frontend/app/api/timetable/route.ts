import { NextResponse } from "next/server";
import { pool } from "@/lib/db/postgres";
import { getSession } from "@/lib/auth/session";

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { message: "Please log in to view the timetable." },
        { status: 401 }
      );
    }

    const result =
      session.role === "ADMIN"
        ? await pool.query(`
            SELECT
              ct.allocation_id,
              ct.day_of_week,
              ct.course_code,
              ct.course_name,
              ct.faculty_name,
              ct.room_number,
              ct.building,
              ct.capacity,
              ct.expected_strength,
              ct.start_time,
              ct.end_time,
              a.slot_id,
              a.room_id,
              a.offering_id
            FROM classroom_timetable ct
            JOIN allocations a
              ON a.allocation_id = ct.allocation_id
            ORDER BY
              CASE ct.day_of_week
                WHEN 'Monday' THEN 1
                WHEN 'Tuesday' THEN 2
                WHEN 'Wednesday' THEN 3
                WHEN 'Thursday' THEN 4
                WHEN 'Friday' THEN 5
                WHEN 'Saturday' THEN 6
              END,
              ct.start_time,
              ct.room_number
          `)
        : await pool.query(
            `
            SELECT
              ct.allocation_id,
              ct.day_of_week,
              ct.course_code,
              ct.course_name,
              ct.faculty_name,
              ct.room_number,
              ct.building,
              ct.capacity,
              ct.expected_strength,
              ct.start_time,
              ct.end_time,
              a.slot_id,
              a.room_id,
              a.offering_id
            FROM classroom_timetable ct
            JOIN allocations a
              ON a.allocation_id = ct.allocation_id
            JOIN course_offerings co
              ON co.offering_id = a.offering_id
            JOIN faculty f
              ON f.faculty_id = co.faculty_id
            WHERE f.user_id = $1
            ORDER BY
              CASE ct.day_of_week
                WHEN 'Monday' THEN 1
                WHEN 'Tuesday' THEN 2
                WHEN 'Wednesday' THEN 3
                WHEN 'Thursday' THEN 4
                WHEN 'Friday' THEN 5
                WHEN 'Saturday' THEN 6
              END,
              ct.start_time,
              ct.room_number
            `,
            [session.userId]
          );

    const slots = await pool.query(`
      SELECT slot_id, start_time, end_time
      FROM time_slots
      ORDER BY start_time
    `);

    return NextResponse.json({
      allocations: result.rows,
      timeSlots: slots.rows,
      role: session.role,
    });
  } catch (error) {
    console.error("Timetable API error:", error);

    return NextResponse.json(
      { message: "Unable to load the timetable." },
      { status: 500 }
    );
  }
}
