import { type NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";
import { v4 as uuidv4 } from "uuid";
import { parseISO } from "date-fns";

// 🔄 Utility to resolve employeeId (UUID) from either UUID or code
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

    // Get ALL records from leave_requests table (for debugging)
    if (getAllRecords) {
      console.log("🔍 Fetching ALL records from leave_requests table...");

      const {
        data: allRecords,
        count: totalCount,
        error: allError,
      } = await supabase
        .from("leave_requests")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });

      if (allError) {
        console.error("❌ Error fetching all records:", allError);
        return NextResponse.json(
          {
            error: "Failed to fetch all records",
            details: allError.message,
          },
          { status: 500 }
        );
      }

      console.log(
        `✅ Found ${totalCount} total records in leave_requests table`
      );
      return NextResponse.json(
        {
          data: allRecords || [],
          count: totalCount || 0,
          message: `Found ${totalCount} total records in leave_requests table`,
        },
        { status: 200 }
      );
    }

    // Handle team lead requests (fetch all requests for team members)
    if (teamLeadId) {
      console.log("Fetching leave requests for team lead:", teamLeadId);

      const teamLeadUUID = await resolveEmployeeId(supabase, teamLeadId);
      if (!teamLeadUUID) {
        return NextResponse.json(
          { error: "Invalid team lead ID" },
          { status: 404 }
        );
      }

      console.log("Team lead UUID:", teamLeadUUID);

      // 🔥 FIX: Fetch leave requests WITHOUT join first
      console.log("🔍 Fetching leave requests for team lead");
      const {
        data: allLeaveRequests,
        count: allCount,
        error: simpleError,
      } = await supabase
        .from("leave_requests")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });

      if (simpleError) {
        console.error("❌ Query failed:", simpleError);
        return NextResponse.json(
          {
            error: "Failed to fetch leave requests",
            details: simpleError.message,
          },
          { status: 500 }
        );
      }

      console.log(`✅ Found ${allCount} leave requests`);

      // 🔥 NOW fetch employee data separately for each request
      if (allLeaveRequests && allLeaveRequests.length > 0) {
        const employeeIds = [
          ...new Set(allLeaveRequests.map((req) => req.employee_id)),
        ];

        const { data: employees, error: empError } = await supabase
          .from("employees")
          .select(
            "id, name, employee_id, designation, phoneNumber, emailAddress, address"
          )
          .in("id", employeeIds);

        if (empError) {
          console.error("❌ Employee fetch failed:", empError);
        } else if (employees) {
          // Create a map for quick lookup
          const employeeMap = new Map(employees.map((emp) => [emp.id, emp]));

          // Attach employee data to each leave request
          allLeaveRequests.forEach((request) => {
            const employee = employeeMap.get(request.employee_id);
            if (employee) {
              request.employee = {
                name: employee.name,
                employee_id: employee.employee_id,
                designation: employee.designation,
                phoneNumber: employee.phoneNumber,
                emailAddress: employee.emailAddress,
                address: employee.address,
              };
            }
          });
        }
      }

      return NextResponse.json(
        {
          data: allLeaveRequests || [],
          count: allCount || 0,
        },
        { status: 200 }
      );
    }

    // Handle individual employee requests
    if (!rawEmployeeId) {
      return NextResponse.json(
        { error: "Missing employee ID" },
        { status: 400 }
      );
    }

    // Convert employee code -> UUID
    const uuid = await resolveEmployeeId(supabase, rawEmployeeId);
    if (!uuid) {
      console.error("Employee not found:", rawEmployeeId);
      return NextResponse.json(
        { error: "Invalid employee ID or not found" },
        { status: 404 }
      );
    }

    console.log(
      `Found employee UUID: ${uuid} for employee_id: ${rawEmployeeId}`
    );

    // 🔍 Build query - same as permission API
    let query = supabase
      .from("leave_requests")
      .select("*", { count: countOnly ? "exact" : undefined })
      .eq("employee_id", uuid);

    // Apply month and year filters if provided - same logic as permission API
    if (month && year) {
      const monthInt = parseInt(month);
      const yearInt = parseInt(year);
      console.log(`Applying filters - month: ${monthInt}, year: ${yearInt}`);

      query = query.eq("month", monthInt).eq("year", yearInt);
    }

    // Apply status filter if provided
    if (status) {
      query = query.eq("status", status);
    }

    query = query.order("created_at", { ascending: false });

    const { data, error, count: total } = await query;

    if (error) {
      console.error("❌ Employee leaves query failed:", error);
      return NextResponse.json(
        {
          error: "Failed to fetch employee leaves",
          details: error.message,
        },
        { status: 500 }
      );
    }

    console.log(
      `✅ Leave count for ${rawEmployeeId} (${month}/${year}): ${total || 0}`
    );

    if (countOnly) {
      return NextResponse.json({ count: total || 0 }, { status: 200 });
    }

    return NextResponse.json(
      {
        data: data || [],
        count: total || 0,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Server error:", err);
    return NextResponse.json(
      {
        error: "Server error",
        details: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// POST Handler
export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient();
  const body = await request.json();

  const {
    employee_id: rawEmployeeId,
    employee_name,
    employee_email,
    start_date,
    end_date,
    leave_type,
    reason,
    team_lead_id,
    manager_id,
  } = body;

  const employee_id = await resolveEmployeeId(supabase, rawEmployeeId);
  if (!employee_id) {
    return NextResponse.json({ error: "Invalid employee ID" }, { status: 404 });
  }

  const id = uuidv4();
  const parsedStartDate = parseISO(start_date);
  const parsedEndDate = parseISO(end_date);

  // Extract month and year from start_date (same as permission API)
  const leaveDate = new Date(start_date);
  const month = leaveDate.getMonth() + 1; // 1-12
  const year = leaveDate.getFullYear();

  console.log(
    `Creating leave request for ${employee_name} - month: ${month}, year: ${year}`
  );

  const { data, error } = await supabase.from("leave_requests").insert([
    {
      id,
      employee_id,
      employee_name,
      employee_email,
      start_date: parsedStartDate,
      end_date: parsedEndDate,
      leave_type,
      reason,
      status: "Pending",
      month,
      year,
      team_lead_id,
      manager_id,
    },
  ]);

  if (error) {
    console.error(
      "Error inserting leave request:",
      error.message,
      error.details
    );
    return NextResponse.json(
      { error: "Failed to apply for leave" },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { message: "Leave applied successfully" },
    { status: 200 }
  );
}

// PATCH Handler
export async function PATCH(request: NextRequest) {
  const supabase = createServerSupabaseClient();
  const body = await request.json();
  const { id, status, reviewed_by } = body;

  const { error } = await supabase
    .from("leave_requests")
    .update({ status, reviewed_by })
    .eq("id", id);

  if (error) {
    console.error("Error updating leave status:", error.message, error.details);
    return NextResponse.json(
      { error: "Failed to update leave status" },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { message: "Leave status updated successfully" },
    { status: 200 }
  );
}
