import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db/postgres";
import { getSession } from "@/lib/auth/session";
import { hash } from "bcryptjs";
import { z } from "zod";

const facultySchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(150),
  password: z.string().min(8).max(100),
  department_id: z.number().int().positive(),
});

async function checkAdmin() {
  const session = await getSession();

  if (!session) return 401;
  if (session.role !== "ADMIN") return 403;

  return 200;
}

// GET: List faculty members, departments and assigned courses
export async function GET() {
  const status = await checkAdmin();

  if (status !== 200) {
    return NextResponse.json(
      { message: "Admin access required" },
      { status }
    );
  }

  try {
    const [facultyResult, departmentsResult] = await Promise.all([
      pool.query(`
        SELECT
          f.faculty_id,
          u.user_id,
          u.name,
          u.email,
          d.department_id,
          d.department_name,
          COUNT(DISTINCT co.offering_id)::int AS assigned_courses,
          COALESCE(
            json_agg(
              DISTINCT jsonb_build_object(
                'course_code', c.course_code,
                'course_name', c.course_name
              )
            ) FILTER (WHERE c.course_id IS NOT NULL),
            '[]'
          ) AS courses
        FROM faculty f
        JOIN users u ON u.user_id = f.user_id
        JOIN departments d ON d.department_id = f.department_id
        LEFT JOIN course_offerings co ON co.faculty_id = f.faculty_id
        LEFT JOIN courses c ON c.course_id = co.course_id
        GROUP BY
          f.faculty_id,
          u.user_id,
          u.name,
          u.email,
          d.department_id,
          d.department_name
        ORDER BY u.name
      `),

      pool.query(`
        SELECT department_id, department_name
        FROM departments
        ORDER BY department_name
      `),
    ]);

    return NextResponse.json({
      faculty: facultyResult.rows,
      departments: departmentsResult.rows,
    });
  } catch (error) {
    console.error("Fetch faculty error:", error);

    return NextResponse.json(
      { message: "Unable to fetch faculty members" },
      { status: 500 }
    );
  }
}

// POST: Create a faculty user and faculty record atomically
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
    const validation = facultySchema.safeParse(await request.json());

    if (!validation.success) {
      return NextResponse.json(
        {
          message: "Invalid faculty details",
          errors: validation.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { name, email, password, department_id } = validation.data;
    const passwordHash = await hash(password, 12);

    await client.query("BEGIN");

    const department = await client.query(
      "SELECT department_id FROM departments WHERE department_id = $1",
      [department_id]
    );

    if (department.rowCount === 0) {
      await client.query("ROLLBACK");

      return NextResponse.json(
        { message: "Selected department does not exist" },
        { status: 400 }
      );
    }

    const userResult = await client.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, 'FACULTY')
       RETURNING user_id, name, email, role`,
      [name, email, passwordHash]
    );

    const user = userResult.rows[0];

    const facultyResult = await client.query(
      `INSERT INTO faculty (user_id, department_id)
       VALUES ($1, $2)
       RETURNING faculty_id, department_id`,
      [user.user_id, department_id]
    );

    await client.query("COMMIT");

    return NextResponse.json(
      {
        message: "Faculty member created successfully",
        faculty: {
          ...facultyResult.rows[0],
          ...user,
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    await client.query("ROLLBACK");

    const dbError = error as { code?: string };

    if (dbError.code === "23505") {
      return NextResponse.json(
        { message: "A user with this email already exists" },
        { status: 409 }
      );
    }

    if (dbError.code === "23503") {
      return NextResponse.json(
        { message: "The selected department does not exist" },
        { status: 400 }
      );
    }

    console.error("Create faculty error:", error);

    return NextResponse.json(
      { message: "Unable to create faculty member" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
