import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db/postgres";
import { getSession } from "@/lib/auth/session";
import { z } from "zod";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const updateSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(150),
  department_id: z.number().int().positive(),
});

async function checkAdmin() {
  const session = await getSession();

  if (!session) return 401;
  if (session.role !== "ADMIN") return 403;

  return 200;
}

async function getFacultyId(context: RouteContext) {
  const { id } = await context.params;
  const facultyId = Number(id);

  if (!Number.isInteger(facultyId) || facultyId <= 0) {
    return null;
  }

  return facultyId;
}

// PUT: Update faculty details
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

  const facultyId = await getFacultyId(context);

  if (!facultyId) {
    return NextResponse.json(
      { message: "Invalid faculty ID" },
      { status: 400 }
    );
  }

  const validation = updateSchema.safeParse(await request.json());

  if (!validation.success) {
    return NextResponse.json(
      { message: "Invalid faculty details" },
      { status: 400 }
    );
  }

  const { name, email, department_id } = validation.data;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const facultyResult = await client.query(
      `SELECT user_id
       FROM faculty
       WHERE faculty_id = $1
       FOR UPDATE`,
      [facultyId]
    );

    if (facultyResult.rowCount === 0) {
      await client.query("ROLLBACK");

      return NextResponse.json(
        { message: "Faculty member not found" },
        { status: 404 }
      );
    }

    const userId = facultyResult.rows[0].user_id;

    const departmentResult = await client.query(
      "SELECT department_id FROM departments WHERE department_id = $1",
      [department_id]
    );

    if (departmentResult.rowCount === 0) {
      await client.query("ROLLBACK");

      return NextResponse.json(
        { message: "Selected department does not exist" },
        { status: 400 }
      );
    }

    await client.query(
      `UPDATE users
       SET name = $1, email = $2
       WHERE user_id = $3`,
      [name, email, userId]
    );

    await client.query(
      `UPDATE faculty
       SET department_id = $1
       WHERE faculty_id = $2`,
      [department_id, facultyId]
    );

    await client.query("COMMIT");

    return NextResponse.json({
      message: "Faculty member updated successfully",
    });
  } catch (error: unknown) {
    await client.query("ROLLBACK");

    const dbError = error as { code?: string };

    if (dbError.code === "23505") {
      return NextResponse.json(
        { message: "A user with this email already exists" },
        { status: 409 }
      );
    }

    console.error("Update faculty error:", error);

    return NextResponse.json(
      { message: "Unable to update faculty member" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

// DELETE: Only delete faculty with no course offerings
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

  const facultyId = await getFacultyId(context);

  if (!facultyId) {
    return NextResponse.json(
      { message: "Invalid faculty ID" },
      { status: 400 }
    );
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query(
      `SELECT user_id
       FROM faculty
       WHERE faculty_id = $1
       FOR UPDATE`,
      [facultyId]
    );

    if (result.rowCount === 0) {
      await client.query("ROLLBACK");

      return NextResponse.json(
        { message: "Faculty member not found" },
        { status: 404 }
      );
    }

    const userId = result.rows[0].user_id;

    const offerings = await client.query(
      `SELECT COUNT(*)::int AS count
       FROM course_offerings
       WHERE faculty_id = $1`,
      [facultyId]
    );

    if (offerings.rows[0].count > 0) {
      await client.query("ROLLBACK");

      return NextResponse.json(
        {
          message:
            "This faculty member has course offerings. Reassign or remove those offerings before deleting the faculty member.",
        },
        { status: 409 }
      );
    }

    await client.query(
      "DELETE FROM faculty WHERE faculty_id = $1",
      [facultyId]
    );

    await client.query(
      "DELETE FROM users WHERE user_id = $1",
      [userId]
    );

    await client.query("COMMIT");

    return NextResponse.json({
      message: "Faculty member deleted successfully",
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Delete faculty error:", error);

    return NextResponse.json(
      { message: "Unable to delete faculty member" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
