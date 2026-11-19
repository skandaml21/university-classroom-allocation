
import { NextResponse } from "next/server";
import { pool } from "@/lib/db/postgres";
import { getSession } from "@/lib/auth/session";

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }

    if (session.role !== "ADMIN") {
      return NextResponse.json(
        { message: "Admin access required" },
        { status: 403 }
      );
    }

    const result = await pool.query(
      "SELECT facility_id, facility_name FROM facilities ORDER BY facility_name"
    );

    return NextResponse.json({ facilities: result.rows });
  } catch (error) {
    console.error("Facilities fetch error:", error);

    return NextResponse.json(
      { message: "Unable to fetch facilities" },
      { status: 500 }
    );
  }
}
