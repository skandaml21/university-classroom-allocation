import { NextResponse } from "next/server";
import { pool } from "@/lib/db/postgres";
import { getSession } from "@/lib/auth/session";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function DELETE(
  _request: Request,
  context: RouteContext
) {
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
        { message: "Only administrators can cancel allocations." },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    const allocationId = Number(id);

    if (!Number.isInteger(allocationId) || allocationId <= 0) {
      return NextResponse.json(
        { message: "Invalid allocation ID." },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `
      DELETE FROM allocations
      WHERE allocation_id = $1
      RETURNING allocation_id
      `,
      [allocationId]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { message: "Allocation not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Allocation cancelled successfully.",
      allocation_id: allocationId
    });
  } catch (error) {
    console.error("Allocation cancellation error:", error);

    return NextResponse.json(
      { message: "Unable to cancel allocation." },
      { status: 500 }
    );
  }
}
