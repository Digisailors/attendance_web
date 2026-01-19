import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Helper to validate UUID v4-ish format
const isUuid = (val: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    val
  );

// Use employees.employee_id as the human-readable identifier (e.g., "DD631")
const CODE_COLUMN = "employee_id";

// Expected payload: { status: "Active" | "Inactive" }
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await params;
    if (!rawId) {
      return NextResponse.json(
        { error: "Missing employee identifier" },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => null);
    const status = body?.status as string | undefined;

    if (!status || !["Active", "Inactive"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Allowed: Active | Inactive" },
        { status: 400 }
      );
    }

    // Decide which column to query: id (UUID) or CODE_COLUMN (text)
    let matchColumn: "id" | typeof CODE_COLUMN = "id";
    let matchValue: string = rawId;

    if (!isUuid(rawId)) {
      matchColumn = CODE_COLUMN;
    }

    // Ensure the employee exists via chosen column
    const { data: existing, error: fetchErr } = await supabase
      .from("employees")
      .select(`id, status, ${CODE_COLUMN}`)
      .eq(matchColumn, matchValue)
      .single();

    if (fetchErr) {
      return NextResponse.json(
        { error: "Error fetching employee", details: fetchErr.message },
        { status: 500 }
      );
    }

    if (!existing) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    const { data: updated, error: updateErr } = await supabase
      .from("employees")
      .update({ status })
      .eq(matchColumn, matchValue)
      .select(`id, status, ${CODE_COLUMN}`)
      .single();

    if (updateErr) {
      return NextResponse.json(
        { error: "Failed to update status", details: updateErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: "Status updated", employee: updated });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Unexpected error", details: e?.message || String(e) },
      { status: 500 }
    );
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await params;
    if (!rawId) {
      return NextResponse.json(
        { error: "Missing employee identifier" },
        { status: 400 }
      );
    }

    const matchColumn = isUuid(rawId) ? "id" : CODE_COLUMN;

    const { data, error } = await supabase
      .from("employees")
      .select(`id, status, ${CODE_COLUMN}`)
      .eq(matchColumn, rawId)
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Error fetching employee", details: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    return NextResponse.json({ employee: data });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Unexpected error", details: e?.message || String(e) },
      { status: 500 }
    );
  }
}
