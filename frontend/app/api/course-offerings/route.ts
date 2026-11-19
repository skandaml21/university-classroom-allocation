import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db/postgres";
import { getSession } from "@/lib/auth/session";
import { z } from "zod";

const offeringSchema = z.object({
  course_id: z.number().int().positive(),
  faculty_id: z.number().int().positive(),
  expected_strength: z.number().int().positive(),
  semester: z.string().trim().min(1).max(30),
  academic_year: z.string().trim().min(1).max(20),
  facility_ids: z.array(z.number().int().positive()).default([]),
});

async function checkAdmin() {
  const session = await getSession();
  if (!session) return 401;
  if (session.role !== "ADMIN") return 403;
  return 200;
}

export async function GET() {
  const status = await checkAdmin();

  if (status !== 200) {
    return NextResponse.json(
      { message: "Admin access required" },
      { status }
    );
  }

  try {
    const [offeringsResult, facultyResult, facilitiesResult, coursesResult] =
      await Promise.all([
        pool.query(`
          SELECT
            co.offering_id,
            co.course_id,
            co.faculty_id,
            co.expected_strength,
            co.semester,
            co.academic_year,
            c.course_code,
            c.course_name,
            u.name AS faculty_name,
            d.department_name,
            COALESCE(
              json_agg(
                json_build_object(
                  'facility_id', f.facility_id,
                  'facility_name', f.facility_name
                )
              ) FILTER (WHERE f.facility_id IS NOT NULL),
              '[]'
            ) AS facilities
          FROM course_offerings co
          JOIN courses c ON c.course_id = co.course_id
          JOIN faculty fa ON fa.faculty_id = co.faculty_id
          JOIN users u ON u.user_id = fa.user_id
          JOIN departments d ON d.department_id = c.department_id
          LEFT JOIN offering_required_facilities orf
            ON orf.offering_id = co.offering_id
          LEFT JOIN facilities f ON f.facility_id = orf.facility_id
          GROUP BY
            co.offering_id,
            c.course_id,
            fa.faculty_id,
            u.name,
            d.department_name
          ORDER BY c.course_code, co.semester
        `),

        pool.query(`
          SELECT
            f.faculty_id,
            u.name,
            u.email,
            d.department_name
          FROM faculty f
          JOIN users u ON u.user_id = f.user_id
          JOIN departments d ON d.department_id = f.department_id
          ORDER BY u.name
        `),

        pool.query(`
          SELECT facility_id, facility_name
          FROM facilities
          ORDER BY facility_name
        `),

        pool.query(`
          SELECT course_id, course_code, course_name
          FROM courses
          ORDER BY course_code
        `),
      ]);

    return NextResponse.json({
      offerings: offeringsResult.rows,
      faculty: facultyResult.rows,
      facilities: facilitiesResult.rows,
      courses: coursesResult.rows,
    });
  } catch (error) {
    console.error("Fetch offerings error:", error);
    return NextResponse.json(
      { message: "Unable to fetch course offerings" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const status = await checkAdmin();

  if (status !== 200) {
    return NextResponse.json(
      { message: "Admin access required" },
      { status }
    );
  }

  const client = await pool.connect();

  try {
    const validation = offeringSchema.safeParse(await request.json());

    if (!validation.success) {
      return NextResponse.json(
        { message: "Invalid course offering details", errors: validation.error.flatten() },
        { status: 400 }
      );
    }

    const {
      course_id,
      faculty_id,
      expected_strength,
      semester,
      academic_year,
      facility_ids,
    } = validation.data;

    await client.query("BEGIN");

    const offeringResult = await client.query(
      `INSERT INTO course_offerings
       (course_id, faculty_id, expected_strength, semester, academic_year)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING offering_id`,
      [course_id, faculty_id, expected_strength, semester, academic_year]
    );

    const offeringId = offeringResult.rows[0].offering_id;

    for (const facilityId of [...new Set(facility_ids)]) {
      await client.query(
        `INSERT INTO offering_required_facilities
         (offering_id, facility_id)
         VALUES ($1, $2)`,
        [offeringId, facilityId]
      );
    }

    await client.query("COMMIT");

    return NextResponse.json(
      {
        message: "Course offering created successfully",
        offering_id: offeringId,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    await client.query("ROLLBACK");

    const dbError = error as { code?: string };

    if (dbError.code === "23503") {
      return NextResponse.json(
        { message: "Selected course, faculty or facility does not exist." },
        { status: 400 }
      );
    }

    if (dbError.code === "23514") {
      return NextResponse.json(
        { message: "Expected student strength must be positive." },
        { status: 400 }
      );
    }

    console.error("Create offering error:", error);
    return NextResponse.json(
      { message: "Unable to create course offering" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
