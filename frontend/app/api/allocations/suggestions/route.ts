import { NextResponse } from "next/server";
import { pool } from "@/lib/db/postgres";
import { getSession } from "@/lib/auth/session";

const validDays = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export async function GET(request: Request) {
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
        { message: "Only administrators can view classroom recommendations." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);

    const offeringId = Number(searchParams.get("offering_id"));
    const slotId = Number(searchParams.get("slot_id"));
    const day = searchParams.get("day");

    if (
      !Number.isInteger(offeringId) || offeringId <= 0 ||
      !Number.isInteger(slotId) || slotId <= 0 ||
      !day || !validDays.includes(day)
    ) {
      return NextResponse.json(
        { message: "Select a valid course, day and time slot." },
        { status: 400 }
      );
    }

    const offeringResult = await pool.query(
      `
      SELECT
        co.offering_id,
        co.expected_strength,
        co.faculty_id,
        c.course_code,
        c.course_name
      FROM course_offerings co
      JOIN courses c ON c.course_id = co.course_id
      WHERE co.offering_id = $1
      `,
      [offeringId]
    );

    if (offeringResult.rowCount === 0) {
      return NextResponse.json(
        { message: "Course offering not found." },
        { status: 404 }
      );
    }

    const offering = offeringResult.rows[0];

    const result = await pool.query(
      `
      SELECT
        cr.room_id,
        cr.room_number,
        cr.building,
        cr.floor,
        cr.capacity,
        COALESCE(
          json_agg(
            json_build_object(
              'facility_id', f.facility_id,
              'facility_name', f.facility_name
            )
          ) FILTER (WHERE f.facility_id IS NOT NULL),
          '[]'
        ) AS facilities,
        cr.capacity - $1 AS spare_capacity
      FROM classrooms cr
      LEFT JOIN classroom_facilities cf
        ON cf.room_id = cr.room_id
      LEFT JOIN facilities f
        ON f.facility_id = cf.facility_id
      WHERE cr.capacity >= $1

        AND NOT EXISTS (
          SELECT 1
          FROM offering_required_facilities required
          WHERE required.offering_id = $2
            AND NOT EXISTS (
              SELECT 1
              FROM classroom_facilities available
              WHERE available.room_id = cr.room_id
                AND available.facility_id = required.facility_id
            )
        )

        AND NOT EXISTS (
          SELECT 1
          FROM allocations a
          WHERE a.room_id = cr.room_id
            AND a.slot_id = $3
            AND a.day_of_week = $4
        )

        AND NOT EXISTS (
          SELECT 1
          FROM allocations a
          JOIN course_offerings other
            ON other.offering_id = a.offering_id
          WHERE other.faculty_id = $5
            AND a.slot_id = $3
            AND a.day_of_week = $4
        )

      GROUP BY cr.room_id
      ORDER BY cr.capacity ASC, cr.room_number ASC
      `,
      [
        offering.expected_strength,
        offeringId,
        slotId,
        day,
        offering.faculty_id,
      ]
    );

    return NextResponse.json({
      course: offering,
      day,
      slot_id: slotId,
      suggestions: result.rows,
      message: result.rows.length
        ? "Suitable classrooms found."
        : "No suitable classroom is available for this selection.",
    });
  } catch (error) {
    console.error("Classroom suggestion error:", error);

    return NextResponse.json(
      { message: "Unable to generate classroom recommendations." },
      { status: 500 }
    );
  }
}
