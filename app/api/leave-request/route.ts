import { type NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";
import { v4 as uuidv4 } from "uuid";
import { parseISO } from "date-fns";

export async function GET(req: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const { searchParams } = new URL(req.url);

    const rawEmployeeId = searchParams.get("employeeId"); // Code like AS886
    const month = searchParams.get("month");
    const year = searchParams.get("year");
    const countOnly = searchParams.get("count") === "true";

    if (!rawEmployeeId || !month || !year) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    // 🧠 Convert employee code -> UUID
    const { data: employeeData, error: employeeError } = await supabase
      .from("employees")
      .select("id, employee_id") // include both UUID and readable code

      .eq("employee_id", rawEmployeeId)
      .single();

    if (employeeError || !employeeData) {
      return NextResponse.json({ error: "Invalid employee ID or not found" }, { status: 404 });
    }

    const uuid = employeeData.id;

    const startDate = `${year}-${month.padStart(2, "0")}-01`;
    const endDate = new Date(parseInt(year), parseInt(month), 0)
      .toISOString()
      .split("T")[0];

    // Debug logging
    console.log("Debug info:", {
      rawEmployeeId,
      uuid,
      startDate,
      endDate,
      month,
      year
    });

    // First, let's try different possible table names and see which one works
    const possibleTableNames = ["leave_requests", "leave_Request", "leaveRequests", "LeaveRequests"];
    
    for (const tableName of possibleTableNames) {
      console.log(`Trying table: ${tableName}`);
      const testQuery = supabase
        .from(tableName)
        .select("*", { count: "exact", head: true })
        .limit(1);
      
      const { error: testError } = await testQuery;
      
      if (!testError) {
        console.log(`✅ Table ${tableName} exists!`);
        
        // Now let's try the actual query with this table
        const actualQuery = supabase
          .from(tableName)
          .select("*", { count: "exact", head: countOnly })
          .eq("employee_id", uuid)
          .gte("from_date", startDate)
          .lte("from_date", endDate);

        const { data, count, error } = await actualQuery;
        
        if (error) {
          console.log(`❌ Query failed on ${tableName}:`, error);
          
          // Try with different column names if from_date doesn't work
          const altQuery = supabase
            .from(tableName)
            .select("*", { count: "exact", head: countOnly })
            .eq("employee_id", uuid)
            .gte("start_date", startDate)
            .lte("start_date", endDate);

          const { data: altData, count: altCount, error: altError } = await altQuery;
          
          if (!altError) {
            console.log(`✅ Query worked with start_date column!`);
            if (countOnly) {
              return NextResponse.json({ count: altCount }, { status: 200 });
            }
            return NextResponse.json({ count: altCount, data: altData }, { status: 200 });
          } else {
            console.log(`❌ Alt query also failed:`, altError);
          }
        } else {
          console.log(`✅ Query successful on ${tableName}!`);
          if (countOnly) {
            return NextResponse.json({ count }, { status: 200 });
          }
          return NextResponse.json({ count, data }, { status: 200 });
        }
      } else {
        console.log(`❌ Table ${tableName} doesn't exist:`, testError);
      }
    }

    // If we get here, none of the table names worked
    return NextResponse.json({ 
      error: "Could not find any matching table", 
      details: "Tried: " + possibleTableNames.join(", "),
      debugInfo: {
        employeeId: rawEmployeeId,
        uuid: uuid,
        startDate,
        endDate,
        tableName: "none found"
      }
    }, { status: 500 });


  } catch (err) {
    console.error("Server error:", err);
    return NextResponse.json({ 
      error: "Server error", 
      details: err instanceof Error ? err.message : "Unknown error" 
    }, { status: 500 });
  }
}

// POST Handler
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
    return NextResponse.json({ error: "Failed to update leave status" }, { status: 500 });
  }

  return NextResponse.json({ message: "Leave status updated successfully" }, { status: 200 });
}