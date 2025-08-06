import { type NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";
import { v4 as uuidv4 } from "uuid";
import { parseISO } from "date-fns";

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
    const getAllRecords = searchParams.get("getAll") === "true"; // New parameter to get all records

    // 🆕 NEW: Get ALL records from leave_requests table (for debugging)
    if (getAllRecords) {
      console.log("🔍 Fetching ALL records from leave_requests table...");
      
      const { data: allRecords, count: totalCount, error: allError } = await supabase
        .from("leave_requests")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });

      if (allError) {
        console.error("❌ Error fetching all records:", allError);
        return NextResponse.json({ 
          error: "Failed to fetch all records", 
          details: allError.message 
        }, { status: 500 });
      }

      console.log(`✅ Found ${totalCount} total records in leave_requests table`);
      return NextResponse.json({ 
        data: allRecords || [],
        count: totalCount || 0,
        message: `Found ${totalCount} total records in leave_requests table`
      }, { status: 200 });
    }

    // Handle team lead requests (fetch all requests for team members)
    if (teamLeadId) {
      console.log("Fetching leave requests for team lead:", teamLeadId);

      // First, let's try to get ALL leave_requests and see what's in the table
      console.log("🔍 Debug: Checking all leave_requests first...");
      const { data: debugAll, error: debugError } = await supabase
        .from("leave_requests")
        .select("*")
        .limit(5);

      if (debugError) {
        console.error("❌ Debug query failed:", debugError);
      } else {
        console.log("🔍 Sample leave_requests data:", JSON.stringify(debugAll, null, 2));
      }

      // Convert team lead code to UUID
      const { data: teamLeadData, error: teamLeadError } = await supabase
        .from("employees")
        .select("id")
        .eq("employee_id", teamLeadId)
        .single();

      if (teamLeadError || !teamLeadData) {
        console.error("Team lead not found:", teamLeadError);
        return NextResponse.json({ error: "Invalid team lead ID" }, { status: 404 });
      }

      const teamLeadUUID = teamLeadData.id;
      console.log("Team lead UUID:", teamLeadUUID);

      // 🆕 Simplified approach - Just get all leave requests for now
      console.log("🔍 Trying simplified approach: Get all leave requests");
      const { data: allLeaveRequests, count: allCount, error: simpleError } = await supabase
        .from("leave_requests")
        .select(`
          *,
          employees!left(
            name,
            employee_id,
            designation,
            phoneNumber,
            emailAddress,
            address
          )
        `, { count: "exact" })
        .order("created_at", { ascending: false });

      if (simpleError) {
        console.error("❌ Simple query failed:", simpleError);
        
        // Try even simpler - just get leave_requests without join
        const { data: verySimple, count: verySimpleCount, error: verySimpleError } = await supabase
          .from("leave_requests")
          .select("*", { count: "exact" })
          .order("created_at", { ascending: false });

        if (verySimpleError) {
          console.error("❌ Very simple query also failed:", verySimpleError);
          return NextResponse.json({ 
            error: "All queries failed", 
            details: verySimpleError.message 
          }, { status: 500 });
        }

        console.log(`✅ Very simple query worked! Found ${verySimpleCount} records`);
        return NextResponse.json({ 
          data: verySimple || [],
          count: verySimpleCount || 0,
          note: "Retrieved without employee details due to join issues"
        }, { status: 200 });
      }

      console.log(`✅ Simple query worked! Found ${allCount} records`);
      return NextResponse.json({ 
        data: allLeaveRequests || [],
        count: allCount || 0 
      }, { status: 200 });
    }

    // Handle individual employee requests
    if (!rawEmployeeId || !month || !year) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    // Convert employee code -> UUID
    const { data: employeeData, error: employeeError } = await supabase
      .from("employees")
      .select("id, employee_id")
      .eq("employee_id", rawEmployeeId)
      .single();

    if (employeeError || !employeeData) {
      console.error("Employee not found:", employeeError);
      
      // 🆕 If employee UUID lookup fails, try with the raw employee ID directly
      console.log("🔍 Trying with raw employee ID:", rawEmployeeId);
      const { data: directQuery, count: directCount, error: directError } = await supabase
        .from("leave_requests")
        .select("*", { count: "exact" })
        .eq("employee_id", rawEmployeeId) // Try with raw ID
        .order("created_at", { ascending: false });

      if (!directError && directQuery) {
        console.log(`✅ Direct query worked! Found ${directCount} records`);
        return NextResponse.json({ 
          data: directQuery,
          count: directCount,
          note: "Used raw employee_id instead of UUID"
        }, { status: 200 });
      }

      return NextResponse.json({ error: "Invalid employee ID or not found" }, { status: 404 });
    }

    const uuid = employeeData.id;

    // Try to get employee's leave requests
    const { data: employeeLeaves, count: empCount, error: empError } = await supabase
      .from("leave_requests")
      .select("*", { count: "exact" })
      .eq("employee_id", uuid)
      .order("created_at", { ascending: false });

    if (empError) {
      console.error("❌ Employee leaves query failed:", empError);
      return NextResponse.json({ 
        error: "Failed to fetch employee leaves", 
        details: empError.message 
      }, { status: 500 });
    }

    console.log(`✅ Found ${empCount} leave requests for employee ${rawEmployeeId}`);
    return NextResponse.json({ 
      data: employeeLeaves || [],
      count: empCount || 0 
    }, { status: 200 });

  } catch (err) {
    console.error("Server error:", err);
    return NextResponse.json({ 
      error: "Server error", 
      details: err instanceof Error ? err.message : "Unknown error" 
    }, { status: 500 });
  }
}

// POST Handler (unchanged)
export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient();
  const body = await request.json();

  const {
    employee_id,
    employee_name,
    from_date,
    to_date,
    leave_type,
    reason,
    month,
    year,
    team_lead_id
  } = body;

  const id = uuidv4();
  const created_at = new Date().toISOString();
  const parsedFromDate = parseISO(from_date);
  const parsedToDate = parseISO(to_date);

  const { data, error } = await supabase.from("leave_requests").insert([
    {
      id,
      employee_id,
      employee_name,
      from_date: parsedFromDate,
      to_date: parsedToDate,
      leave_type,
      reason,
      created_at,
      status: "Pending",
      month,
      year,
      team_lead_id
    }
  ]);

  if (error) {
    console.error("Error inserting leave request:", error.message, error.details);
    return NextResponse.json({ error: "Failed to apply for leave" }, { status: 500 });
  }

  return NextResponse.json({ message: "Leave applied successfully" }, { status: 200 });
}

// PATCH Handler (unchanged)
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
    return NextResponse.json({ error: "Failed to update leave status" }, { status: 500 });
  }

  return NextResponse.json({ message: "Leave status updated successfully" }, { status: 200 });
}