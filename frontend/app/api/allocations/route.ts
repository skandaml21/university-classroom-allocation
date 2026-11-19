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
        { message: "Only administrators can manage allocations." },
        { status: 403 }
      );
    }

    const offerings = await pool.query(`
      SELECT
        co.offering_id,
        c.course_code,
        c.course_name,
        u.name AS faculty_name,
        co.expected_strength,
        COALESCE(
          json_agg(
            json_build_object(
              'facility_id', f.facility_id,
              'facility_name', f.facility_name
            )
          ) FILTER (WHERE f.facility_id IS NOT NULL),
          '[]'
        ) AS required_facilities
      FROM course_offerings co
      JOIN courses c
        ON c.course_id = co.course_id
      JOIN faculty fac
        ON fac.faculty_id = co.faculty_id
      JOIN users u
        ON u.user_id = fac.user_id
      LEFT JOIN offering_required_facilities orf
        ON orf.offering_id = co.offering_id
      LEFT JOIN facilities f
        ON f.facility_id = orf.facility_id
      GROUP BY
        co.offering_id,
        c.course_code,
        c.course_name,
        u.name,
        co.expected_strength
      ORDER BY co.offering_id
    `);

    const classrooms = await pool.query(`
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
        ) AS facilities
      FROM classrooms cr
      LEFT JOIN classroom_facilities cf
        ON cf.room_id = cr.room_id
      LEFT JOIN facilities f
        ON f.facility_id = cf.facility_id
      GROUP BY
        cr.room_id,
        cr.room_number,
        cr.building,
        cr.floor,
        cr.capacity
      ORDER BY cr.room_number
    `);

    const slots = await pool.query(`
      SELECT slot_id, start_time, end_time
      FROM time_slots
      ORDER BY start_time
    `);

    return NextResponse.json({
      offerings: offerings.rows,
      classrooms: classrooms.rows,
      timeSlots: slots.rows,
      days: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday"
      ]
    });
  } catch (error) {
    console.error("Allocation GET error:", error);

    return NextResponse.json(
      { message: "Unable to load allocation information." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
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
        { message: "Only administrators can create allocations." },
        { status: 403 }
      );
    }

    const body = await request.json();

    const offeringId = Number(body.offering_id);
    const roomId = Number(body.room_id);
    const slotId = Number(body.slot_id);
    const day = body.day_of_week;

    if (
      !Number.isInteger(offeringId) || offeringId <= 0 ||
      !Number.isInteger(roomId) || roomId <= 0 ||
      !Number.isInteger(slotId) || slotId <= 0 ||
      !["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].includes(day)
    ) {
      return NextResponse.json(
        { message: "Please provide valid course, classroom, day and time slot details." },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `
      INSERT INTO allocations (
        offering_id,
        room_id,
        slot_id,
        day_of_week
      )
      VALUES ($1, $2, $3, $4)
      RETURNING allocation_id, offering_id, room_id, slot_id, day_of_week
      `,
      [offeringId, roomId, slotId, day]
    );

    return NextResponse.json(
      {
        message: "Classroom allocated successfully.",
        allocation: result.rows[0]
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Allocation POST error:", error);

    const dbError = error as {
      code?: string;
      message?: string;
    };

    if (dbError.code === "23505") {
      return NextResponse.json(
        { message: "This course or classroom already has an allocation in that time slot." },
        { status: 409 }
      );
    }

    if (dbError.code === "23503") {
      return NextResponse.json(
        { message: "The selected course, classroom or time slot does not exist." },
        { status: 400 }
      );
    }

    if (dbError.code === "23514" || dbError.code === "P0001") {
      return NextResponse.json(
        {
          message: dbError.message || "The allocation failed database validation."
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { message: "Unable to create classroom allocation." },
      { status: 500 }
    );
  }
}
