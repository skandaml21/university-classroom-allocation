import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db/postgres";
import { getSession } from "@/lib/auth/session";
import { z } from "zod";

type RouteContext = {
  params: Promise<{ id: string }>;
};

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

async function getOfferingId(context: RouteContext) {
  const { id } = await context.params;
  const offeringId = Number(id);
  return Number.isInteger(offeringId) && offeringId > 0
    ? offeringId
    : null;
}

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

  const offeringId = await getOfferingId(context);

  if (!offeringId) {
    return NextResponse.json(
      { message: "Invalid offering ID" },
      { status: 400 }
    );
  }

  const validation = offeringSchema.safeParse(await request.json());

  if (!validation.success) {
    return NextResponse.json(
      { message: "Invalid course offering details" },
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

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query(
      `UPDATE course_offerings
       SET course_id = $1,
           faculty_id = $2,
           expected_strength = $3,
           semester = $4,
           academic_year = $5
       WHERE offering_id = $6
       RETURNING offering_id`,
      [
        course_id,
        faculty_id,
        expected_strength,
        semester,
        academic_year,
        offeringId,
      ]
    );

    if (result.rowCount === 0) {
      await client.query("ROLLBACK");

      return NextResponse.json(
        { message: "Course offering not found" },
        { status: 404 }
      );
    }

    await client.query(
      "DELETE FROM offering_required_facilities WHERE offering_id = $1",
      [offeringId]
    );

    for (const facilityId of [...new Set(facility_ids)]) {
      await client.query(
        `INSERT INTO offering_required_facilities
         (offering_id, facility_id)
         VALUES ($1, $2)`,
        [offeringId, facilityId]
      );
    }

    await client.query("COMMIT");

    return NextResponse.json({
      message: "Course offering updated successfully",
    });
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

    console.error("Update offering error:", error);
    return NextResponse.json(
      { message: "Unable to update course offering" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

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

  const offeringId = await getOfferingId(context);

  if (!offeringId) {
    return NextResponse.json(
      { message: "Invalid offering ID" },
      { status: 400 }
    );
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query(
      `SELECT offering_id
       FROM course_offerings
       WHERE offering_id = $1
       FOR UPDATE`,
      [offeringId]
    );

    if (result.rowCount === 0) {
      await client.query("ROLLBACK");

      return NextResponse.json(
        { message: "Course offering not found" },
        { status: 404 }
      );
    }

    const allocationResult = await client.query(
      `SELECT COUNT(*)::int AS count
       FROM allocations
       WHERE offering_id = $1`,
      [offeringId]
    );

    if (allocationResult.rows[0].count > 0) {
      await client.query("ROLLBACK");

      return NextResponse.json(
        {
          message:
            "This offering has classroom allocations. Cancel or reassign those allocations before deleting it.",
        },
        { status: 409 }
      );
    }

    await client.query(
      "DELETE FROM offering_required_facilities WHERE offering_id = $1",
      [offeringId]
    );

    await client.query(
      "DELETE FROM course_offerings WHERE offering_id = $1",
      [offeringId]
    );

    await client.query("COMMIT");

    return NextResponse.json({
      message: "Course offering deleted successfully",
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Delete offering error:", error);
    return NextResponse.json(
      { message: "Unable to delete course offering" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
