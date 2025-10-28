import { type NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { parseISO } from "date-fns";
import { createServerSupabaseClient } from "@/lib/supabase";

// Create the server client instance at the top
const supabase = createServerSupabaseClient();
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
    .single(); // ✅ This is OK because employee_id should be unique

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

    // Do NOT DB-filter by month/year to avoid excluding legacy rows.
    if (status) query = query.eq("status", status);
    query = query.order("created_at", { ascending: false });

    const { data, error, count } = await query;
    if (error) throw error;

    let finalData = data || [];
    // Apply month/year filtering in-memory so we can include rows missing month/year by using date
    if (!countOnly && monthInt && yearInt) {
      finalData = finalData.filter((r: any) => {
        const hasMonthYear = r.month != null && r.year != null;
        if (hasMonthYear) {
          return r.month === monthInt && r.year === yearInt;
        }
        if (!r.date) return false;
        try {
          const d = typeof r.date === "string" ? new Date(r.date) : new Date(r.date);
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
// Replace your POST function in api/permission-request/route.ts

export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient();
  const body = await request.json();

  const {
    employee_id: rawEmployeeId,
    employee_name,
    employee_email,
    permission_type,
    date,
    start_time,
    end_time,
    reason,
  } = body;

  const employee_id = await resolveEmployeeId(supabase, rawEmployeeId);
  if (!employee_id)
    return NextResponse.json({ error: "Invalid employee ID" }, { status: 404 });

  // ✅ Fetch team_lead_ids from employees table
  const { data: empData, error: empErr } = await supabase
    .from("employees")
    .select("team_lead_ids, manager_id")
    .eq("id", employee_id)
    .single();

  if (empErr || !empData) {
    console.error("❌ Could not fetch employee data:", empErr);
    return NextResponse.json(
      { error: "Could not find employee data" },
      { status: 400 }
    );
  }

  const { team_lead_ids, manager_id } = empData;

  // ✅ Fallback if no team leads assigned
  const finalTeamLeadIds =
    team_lead_ids && team_lead_ids.length > 0
      ? team_lead_ids
      : ["DEFAULT_LEAD"];

  const parsedDate = parseISO(date);
  const month = parsedDate.getMonth() + 1;
  const year = parsedDate.getFullYear();

  const id = uuidv4();

  console.log(
    `📝 Creating permission for ${employee_name}, team leads: ${JSON.stringify(
      finalTeamLeadIds
    )}, manager: ${manager_id}`
  );

  // ✅ Insert and return the created record
  const { data: createdRecord, error } = await supabase
    .from("permission_requests")
    .insert([
      {
        id,
        employee_id,
        employee_name,
        employee_email,
        permission_type,
        date: parsedDate,
        start_time,
        end_time,
        reason,
        status: "Pending Team Lead",
        team_lead_ids: finalTeamLeadIds,
        team_lead_id: null,
        manager_id,
        month,
        year,
      },
    ])
    .select() // ✅ Return the inserted record
    .single();

  if (error) {
    console.error("Insert failed:", error);
    return NextResponse.json(
      { error: "Failed to apply for permission" },
      { status: 500 }
    );
  }

  // ✅ Return the created record with ID
  return NextResponse.json(
    {
      message: "Permission applied successfully",
      id: createdRecord.id, // Return the ID for notifications
      data: createdRecord,
    },
    { status: 200 }
  );
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
    // ✅ Store the specific team lead ID who is approving/rejecting
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
