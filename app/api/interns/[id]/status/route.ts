// app/api/interns/[id]/status/route.ts
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const internId = params.id;
    const body = await request.json();
    const { status } = body;

    // Validate status
    const validStatuses = ["Active", "Inactive", "Completed"];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Must be Active, Inactive, or Completed" },
        { status: 400 }
      );
    }

    console.log(`Updating intern ${internId} status to: ${status}`);

    // Update intern status
    const { data, error } = await supabase
      .from("interns")
      .update({
        status: status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", internId)
      .select()
      .single();

    if (error) {
      console.error("Error updating intern status:", error);
      return NextResponse.json(
        { error: "Failed to update status", details: error.message },
        { status: 500 }
      );
    }

    console.log("Status updated successfully:", data);

    return NextResponse.json({
      message: "Status updated successfully",
      intern: data,
    });
  } catch (error) {
    console.error("Error in PATCH status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
