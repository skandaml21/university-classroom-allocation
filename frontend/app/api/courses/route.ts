import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db/postgres";
import { getSession } from "@/lib/auth/session";
import { z } from "zod";

const courseSchema = z.object({
  course_code: z.string().trim().min(2).max(20),
  course_name: z.string().trim().min(2).max(150),
  department_id: z.number().int().positive(),
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
    const [coursesResult, departmentsResult] = await Promise.all([
      pool.query(`
        SELECT
          c.course_id,
          c.course_code,
          c.course_name,
          c.department_id,
          d.department_name,
          COUNT(DISTINCT co.offering_id)::int AS offering_count
        FROM courses c
        JOIN departments d ON d.department_id = c.department_id
        LEFT JOIN course_offerings co ON co.course_id = c.course_id
        GROUP BY c.course_id, d.department_id
        ORDER BY c.course_code
      `),
      pool.query(`
        SELECT department_id, department_name
        FROM departments
        ORDER BY department_name
      `),
    ]);

    return NextResponse.json({
      courses: coursesResult.rows,
      departments: departmentsResult.rows,
    });
  } catch (error) {
    console.error("Fetch courses error:", error);
    return NextResponse.json(
      { message: "Unable to fetch courses" },
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

  try {
    const validation = courseSchema.safeParse(await request.json());

    if (!validation.success) {
      return NextResponse.json(
        { message: "Invalid course details", errors: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { course_code, course_name, department_id } = validation.data;

    const result = await pool.query(
      `INSERT INTO courses (course_code, course_name, department_id)
       VALUES ($1, $2, $3)
       RETURNING course_id, course_code, course_name, department_id`,
      [course_code, course_name, department_id]
    );

    return NextResponse.json(
      {
        message: "Course created successfully",
        course: result.rows[0],
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const dbError = error as { code?: string };

    if (dbError.code === "23505") {
      return NextResponse.json(
        { message: "This course code already exists." },
        { status: 409 }
      );
    }

    if (dbError.code === "23503") {
      return NextResponse.json(
        { message: "Selected department does not exist." },
        { status: 400 }
      );
    }

    console.error("Create course error:", error);
    return NextResponse.json(
      { message: "Unable to create course" },
      { status: 500 }
    );
  }
}
