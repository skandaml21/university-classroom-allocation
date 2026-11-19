import { NextResponse } from "next/server";
import { pool } from "@/lib/db/postgres";
import { getSession } from "@/lib/auth/session";

export async function GET() {
  try {
    const session = await getSession();

    if (!session || session.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const [
      summaryResult,
      roomsResult,
      dailyResult,
      courseResult,
    ] = await Promise.all([
      pool.query(`
        SELECT
          (SELECT COUNT(*) FROM classrooms) AS total_classrooms,
          (SELECT COUNT(*) FROM courses) AS total_courses,
          (SELECT COUNT(*) FROM faculty) AS total_faculty,
          (SELECT COUNT(*) FROM allocations) AS total_allocations,
          (
            SELECT COUNT(*)
            FROM classroom_utilization
            WHERE total_allocations > 0
          ) AS occupied_classrooms,
          (
            SELECT COALESCE(
              ROUND(AVG(average_capacity_utilization)::numeric, 2),
              0
            )
            FROM classroom_utilization
            WHERE total_allocations > 0
          ) AS average_utilization
      `),

      pool.query(`
        SELECT
          room_id,
          room_number,
          building,
          capacity,
          total_allocations,
          average_capacity_utilization
        FROM classroom_utilization
        ORDER BY total_allocations DESC, room_number ASC
      `),

      pool.query(`
        SELECT
          day_of_week,
          COUNT(*) AS allocation_count
        FROM allocations
        GROUP BY day_of_week
      `),

      pool.query(`
        SELECT
          c.course_code,
          c.course_name,
          COUNT(a.allocation_id) AS allocation_count,
          COALESCE(SUM(co.expected_strength), 0) AS allocated_students
        FROM courses c
        LEFT JOIN course_offerings co
          ON co.course_id = c.course_id
        LEFT JOIN allocations a
          ON a.offering_id = co.offering_id
        GROUP BY c.course_id, c.course_code, c.course_name
        ORDER BY allocation_count DESC, c.course_code ASC
      `),
    ]);

    const days = [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];

    const dailyRows = dailyResult.rows;
    const dailyAllocations = days.map((day) => {
      const found = dailyRows.find(
        (row) => row.day_of_week === day
      );

      return {
        day,
        count: Number(found?.allocation_count ?? 0),
      };
    });

    return NextResponse.json({
      summary: summaryResult.rows[0],
      rooms: roomsResult.rows,
      dailyAllocations,
      courses: courseResult.rows,
    });
  } catch (error) {
    console.error("Analytics API error:", error);

    return NextResponse.json(
      { error: "Failed to load analytics" },
      { status: 500 }
    );
  }
}
