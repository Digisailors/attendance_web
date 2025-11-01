import { type NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { parseISO } from "date-fns";
import { createServerSupabaseClient } from "@/lib/supabase";

// 🔹 Resolve UUID from employee code
async function resolveEmployeeId(
  supabase: any,
  rawId: string
): Promise<string | null> {
  const isUuid = rawId.includes("-") && rawId.length >= 36;
  if (isUuid) return rawId;

  const { data, error } = await supabase
    .from("employees")
    .select("id")
    .eq("employee_id", rawId)
    .single();

  if (error || !data) {
    console.error("Failed to resolve employee ID:", error);
    return null;
  }

  return data.id;
}

// 🟩 GET — Fetch permission requests
export async function GET(req: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const { searchParams } = new URL(req.url);

    const rawEmployeeId = searchParams.get("employeeId");
    const teamLeadId = searchParams.get("teamLeadId");
    const month = searchParams.get("month");
    const year = searchParams.get("year");
    const countOnly = searchParams.get("count") === "true";
    const status = searchParams.get("status");
    const getAllRecords = searchParams.get("getAll") === "true";

    // 🔍 Fetch all for debug
    if (getAllRecords) {
      const { data, count, error } = await supabase
        .from("permission_requests")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });

      if (error) throw error;
      return NextResponse.json({ data, count }, { status: 200 });
    }

    // 🧩 Fetch for team lead
    if (teamLeadId) {
      console.log("Fetching permission requests for TL:", teamLeadId);
      const teamLeadUUID = await resolveEmployeeId(supabase, teamLeadId);
      if (!teamLeadUUID)
        return NextResponse.json(
          { error: "Invalid team lead ID" },
          { status: 400 }
        );

      const { data, error } = await supabase
        .from("permission_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Only include requests where teamLeadId is in team_lead_ids
      const filtered = data.filter(
        (req) => req.team_lead_ids && req.team_lead_ids.includes(teamLeadId)
      );

      return NextResponse.json({ data: filtered }, { status: 200 });
    }

    // 🧩 Fetch for specific employee
    if (!rawEmployeeId) {
      return NextResponse.json(
        { error: "Missing employee ID" },
        { status: 400 }
      );
    }

    const uuid = await resolveEmployeeId(supabase, rawEmployeeId);
    if (!uuid)
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );

    let query = supabase
      .from("permission_requests")
      .select("*", { count: countOnly ? "exact" : undefined })
      .eq("employee_id", uuid);

    const monthInt = month ? parseInt(month) : undefined;
    const yearInt = year ? parseInt(year) : undefined;

    if (status) query = query.eq("status", status);
    query = query.order("created_at", { ascending: false });

    const { data, error, count } = await query;
    if (error) throw error;

    let finalData = data || [];
    // Apply month/year filtering in-memory
    if (!countOnly && monthInt && yearInt) {
      finalData = finalData.filter((r: any) => {
        const hasMonthYear = r.month != null && r.year != null;
        if (hasMonthYear) {
          return r.month === monthInt && r.year === yearInt;
        }
        if (!r.date) return false;
        try {
          const d =
            typeof r.date === "string" ? new Date(r.date) : new Date(r.date);
          const dMonth = d.getMonth() + 1;
          const dYear = d.getFullYear();
          return dMonth === monthInt && dYear === yearInt;
        } catch {
          return false;
        }
      });
    }

    if (countOnly) return NextResponse.json({ count }, { status: 200 });
    return NextResponse.json({ data: finalData, count }, { status: 200 });
  } catch (err: any) {
    console.error("GET error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// 🟩 POST — Apply for permission
export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient();

  try {
    const body = await request.json();

    const {
      employee_id,
      employee_name,
      employee_email,
      team_lead_id,
      team_lead_ids,
      manager_id,
      permission_type,
      date,
      month,
      year,
      start_time,
      end_time,
      reason,
    } = body;

    // Validate required fields
    if (
      !employee_id ||
      !employee_name ||
      !employee_email ||
      !permission_type ||
      !date ||
      !start_time ||
      !end_time ||
      !reason
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate team_lead_ids
    if (!team_lead_ids || team_lead_ids.length === 0) {
      return NextResponse.json(
        { error: "No team leads found" },
        { status: 400 }
      );
    }

    // Parse date for month/year
    const parsedDate = parseISO(date);
    const calculatedMonth = month || parsedDate.getMonth() + 1;
    const calculatedYear = year || parsedDate.getFullYear();

    const id = uuidv4();

    console.log(
      `📝 Creating permission for ${employee_name}, team leads: ${JSON.stringify(
        team_lead_ids
      )}, manager: ${manager_id}`
    );

    // Insert permission request directly
    const { data: permissionRequest, error: insertError } = await supabase
      .from("permission_requests")
      .insert({
        id,
        employee_id,
        employee_name,
        employee_email,
        team_lead_id: null, // Will be set when someone approves
        team_lead_ids,
        manager_id,
        permission_type,
        date: parsedDate,
        month: calculatedMonth,
        year: calculatedYear,
        start_time,
        end_time,
        reason,
        status: "Pending Team Lead",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return NextResponse.json(
        {
          error: `Failed to create permission request: ${insertError.message}`,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: "Permission request created successfully",
        id: permissionRequest.id,
        data: permissionRequest,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// 🟩 PATCH — Update approval or rejection
export async function PATCH(request: NextRequest) {
  const supabase = createServerSupabaseClient();
  const body = await request.json();

  const { id, action, team_lead_id, manager_id, comments } = body;

  const { data: reqData, error: fetchError } = await supabase
    .from("permission_requests")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !reqData) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  const updateData: any = {
    updated_at: new Date().toISOString(),
  };

  // 🧩 Team Lead Action
  if (team_lead_id && reqData.status === "Pending Team Lead") {
    updateData.team_lead_id = team_lead_id;
    updateData.team_lead_comments = comments || null;

    if (action === "approve") {
      updateData.status = "Pending Manager Approval";
      updateData.approved_at = new Date().toISOString();
    } else if (action === "reject") {
      updateData.status = "Rejected";
      updateData.rejected_at = new Date().toISOString();
    }
  }

  // 🧩 Manager Action
  if (manager_id && reqData.status === "Pending Manager Approval") {
    updateData.manager_comments = comments || null;

    if (action === "approve") {
      updateData.status = "Approved";
      updateData.approved_at = new Date().toISOString();
    } else if (action === "reject") {
      updateData.status = "Rejected";
      updateData.rejected_at = new Date().toISOString();
    }
  }

  const { error: updateError } = await supabase
    .from("permission_requests")
    .update(updateData)
    .eq("id", id);

  if (updateError) {
    console.error("Update failed:", updateError);
    return NextResponse.json(
      { error: "Failed to update request" },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { message: "Permission status updated" },
    { status: 200 }
  );
}
