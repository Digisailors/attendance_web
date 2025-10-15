import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Helper function to get IST date (YYYY-MM-DD)
const getISTDate = () => {
  const now = new Date();
  const istDate = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
  );
  const year = istDate.getFullYear();
  const month = String(istDate.getMonth() + 1).padStart(2, "0");
  const day = String(istDate.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const employeeId = params.id;
    const { searchParams } = new URL(request.url);
    const requestedDate = searchParams.get("date");
    const today = requestedDate || getISTDate();

    const { data: employee, error } = await supabase
      .from("employees")
      .select("id")
      .eq("employee_id", employeeId)
      .single();

    if (error || !employee) {
      console.error("Employee not found:", error);
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    const { data: worklog, error: worklogError } = await supabase
      .from("daily_work_log")
      .select("*")
      .eq("employee_id", employee.id)
      .eq("date", today)
      .single();

    if (worklogError) {
      if (worklogError.code === "PGRST116") {
        // No worklog found for this date
        return NextResponse.json({}, { status: 200 });
      }
      console.error("Error fetching worklog:", worklogError);
      return NextResponse.json(
        { error: worklogError.message },
        { status: 400 }
      );
    }

    // Return worklog as-is (PostgreSQL timestamptz will be in ISO format)
    return NextResponse.json(worklog || {});
  } catch (err) {
    console.error("Error in GET request:", err);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const employeeId = params.id;
    const body = await request.json();
    console.log("Incoming body:", body);

    const { checkInTime, checkOutTime, workType, workDescription } = body;

    // Get employee internal ID
    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .select("id, name")
      .eq("employee_id", employeeId)
      .single();

    if (employeeError || !employee) {
      console.error("Employee not found:", employeeError);
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    const today = getISTDate();

    // Check for existing entry
    const { data: existingEntry, error: checkError } = await supabase
      .from("daily_work_log")
      .select("*")
      .eq("employee_id", employee.id)
      .eq("date", today)
      .maybeSingle();

    if (checkError) {
      console.error("Error checking existing entry:", checkError);
      return NextResponse.json(
        { error: "Database error", details: checkError.message },
        { status: 500 }
      );
    }

    // HANDLE CHECK-IN ONLY
    if (checkInTime && !checkOutTime) {
      if (existingEntry) {
        return NextResponse.json(
          { error: "Already checked in today" },
          { status: 400 }
        );
      }

      // checkInTime comes as ISO string from frontend
      // PostgreSQL timestamptz will automatically handle the conversion
      const { data: inserted, error: insertError } = await supabase
        .from("daily_work_log")
        .insert([
          {
            employee_id: employee.id,
            date: today,
            check_in: checkInTime, // Pass ISO string directly
            status: "Present",
          },
        ])
        .select()
        .single();

      if (insertError) {
        console.error("Insert error:", insertError);
        return NextResponse.json(
          { error: "Failed to insert check-in", details: insertError.message },
          { status: 500 }
        );
      }

      // UPDATE ATTENDANCE
      const istNow = new Date(
        new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
      );
      const month = istNow.getMonth() + 1;
      const year = istNow.getFullYear();

      const { data: attendance, error: attErr } = await supabase
        .from("attendance")
        .select("*")
        .eq("employee_id", employee.id)
        .eq("month", month)
        .eq("year", year)
        .maybeSingle();

      if (attErr) {
        console.error("Error checking attendance:", attErr);
      }

      if (attendance) {
        const { error: updateAttError } = await supabase
          .from("attendance")
          .update({ working_days: attendance.working_days + 1 })
          .eq("id", attendance.id);

        if (updateAttError) {
          console.error("Error updating attendance:", updateAttError);
        }
      } else {
        const { error: insertAttError } = await supabase
          .from("attendance")
          .insert([
            {
              employee_id: employee.id,
              month,
              year,
              total_days: 30,
              working_days: 1,
              permissions: 0,
              leaves: 0,
              missed_days: 0,
            },
          ]);

        if (insertAttError) {
          console.error("Error inserting attendance:", insertAttError);
        }
      }

      console.log("Check-in successful:", inserted);
      return NextResponse.json({
        message: "Checked in successfully",
        data: inserted,
      });
    }

    // HANDLE CHECK-OUT (update existing entry)
    if (checkOutTime && workType && workDescription) {
      if (!existingEntry) {
        return NextResponse.json(
          { error: "Check-in entry not found. Please check in first." },
          { status: 400 }
        );
      }

      // Calculate hours worked
      const checkInDate = new Date(checkInTime);
      const checkOutDate = new Date(checkOutTime);

      if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
        return NextResponse.json(
          { error: "Invalid timestamp format" },
          { status: 400 }
        );
      }

      const hoursWorked = (
        (checkOutDate.getTime() - checkInDate.getTime()) /
        (1000 * 60 * 60)
      ).toFixed(2);

      // Update the existing entry with checkout info
      const { data: updated, error: updateError } = await supabase
        .from("daily_work_log")
        .update({
          check_out: checkOutTime, // Pass ISO string directly
          hours: parseFloat(hoursWorked),
          project: workType,
          description: workDescription,
        })
        .eq("id", existingEntry.id)
        .select()
        .single();

      if (updateError) {
        console.error("Update error:", updateError);
        return NextResponse.json(
          { error: "Failed to update check-out", details: updateError.message },
          { status: 500 }
        );
      }

      console.log("Check-out successful:", updated);
      return NextResponse.json({
        message: "Checked out successfully",
        workLog: updated,
      });
    }

    // Invalid request
    return NextResponse.json(
      {
        error:
          "Invalid request body. Provide either checkInTime only, or checkInTime with checkOutTime, workType, and workDescription.",
      },
      { status: 400 }
    );
  } catch (err) {
    console.error("Error in POST request:", err);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
