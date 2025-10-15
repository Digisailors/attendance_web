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

// Helper function to get IST date
const getISTDate = () => {
  const now = new Date();
  const istDate = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
  );
  return istDate.toISOString().split("T")[0];
};

// Helper function to convert ISO string to IST timestamp
const getISTTimestamp = (isoString: string) => {
  const date = new Date(isoString);
  // Create a new date object in IST
  const istDate = new Date(
    date.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
  );
  // Return as ISO string which includes timezone info
  return istDate.toISOString();
};

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const employeeId = params.id;
    const today = getISTDate(); // Use IST date

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
        return NextResponse.json({}, { status: 200 });
      }
      console.error("Error fetching worklog:", worklogError);
      return NextResponse.json(
        { error: worklogError.message },
        { status: 400 }
      );
    }

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

    const today = getISTDate(); // Use IST date
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

    let workLogData;

    if (checkInTime && !checkOutTime) {
      // Handle CHECK-IN ONLY
      if (existingEntry) {
        return NextResponse.json(
          { error: "Already checked in today" },
          { status: 400 }
        );
      }

      // Convert to full IST timestamp instead of just time
      const checkInTimestamp = getISTTimestamp(checkInTime);

      const { data: inserted, error: insertError } = await supabase
        .from("daily_work_log")
        .insert([
          {
            employee_id: employee.id,
            date: today,
            check_in: checkInTimestamp, // Now using full timestamp
            status: "Present",
          },
        ])
        .select()
        .single();

      if (insertError) {
        return NextResponse.json(
          { error: "Failed to insert check-in", details: insertError.message },
          { status: 500 }
        );
      }

      // Attendance Update
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

      return NextResponse.json({ message: "Checked in successfully" });
    }

    if (checkOutTime && workType && workDescription) {
      // Handle CHECK-OUT and update existing entry
      if (!existingEntry) {
        return NextResponse.json(
          { error: "Check-in entry not found" },
          { status: 400 }
        );
      }

      // Convert to full IST timestamp instead of just time
      const checkOutTimestamp = getISTTimestamp(checkOutTime);

      // Create proper Date objects for hour calculation
      const checkInDate = new Date(checkInTime); // This is already IST from frontend
      const checkOutDate = new Date(checkOutTime); // This is already IST from frontend

      const hoursWorked = (
        (checkOutDate.getTime() - checkInDate.getTime()) /
        (1000 * 60 * 60)
      ).toFixed(2);

      const { data: updated, error: updateError } = await supabase
        .from("daily_work_log")
        .update({
          check_out: checkOutTimestamp, // Now using full timestamp
          hours: parseFloat(hoursWorked),
          project: workType,
          description: workDescription,
        })
        .eq("id", existingEntry.id)
        .select()
        .single();

      if (updateError) {
        return NextResponse.json(
          { error: "Failed to update check-out", details: updateError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        message: "Checked out successfully",
        workLog: updated,
      });
    }

    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  } catch (err) {
    return NextResponse.json(
      {
        error: "Internal server error",
        details: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
