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

// Fetch server time in IST
const fetchServerTime = async () => {
  try {
    const response = await fetch(
      `${
        process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
      }/api/server-time`
    );
    if (!response.ok) throw new Error("Failed to fetch server time");
    const data = await response.json();
    return new Date(data.time);
  } catch (error) {
    console.error("Error fetching server time:", error);
    // Fallback to local time converted to IST
    const now = new Date();
    return new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  }
};

// Helper function to get IST date from server time
const getISTDate = async () => {
  const istTime = await fetchServerTime();
  return istTime.toISOString().split("T")[0];
};

// Helper function to convert ISO datetime to time string (HH:MM:SS)
const getISTTimeString = (isoString: string) => {
  const date = new Date(isoString);
  // Ensure we're working with IST time
  const istTime = new Date(
    date.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
  );
  return istTime.toTimeString().split(" ")[0]; // Format: HH:MM:SS
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: employeeId } = await params;
  const today = await getISTDate(); // Use server time for IST date

  const { data: employee, error } = await supabase
    .from("employees")
    .select("id")
    .eq("employee_id", employeeId)
    .single();

  if (error || !employee)
    return NextResponse.json({ error: "Employee not found" }, { status: 404 });

  const { data: worklog } = await supabase
    .from("daily_work_log")
    .select("*")
    .eq("employee_id", employee.id)
    .eq("date", today)
    .single();

  if (!worklog) return NextResponse.json({}, { status: 200 });

  return NextResponse.json(worklog);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: employeeId } = await params;
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
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    const today = await getISTDate(); // Use server time for IST date

    const { data: existingEntry, error: checkError } = await supabase
      .from("daily_work_log")
      .select("*")
      .eq("employee_id", employee.id)
      .eq("date", today)
      .maybeSingle();

    if (checkInTime && !checkOutTime) {
      // Handle CHECK-IN ONLY
      if (existingEntry) {
        return NextResponse.json(
          { error: "Already checked in today" },
          { status: 400 }
        );
      }

      // Convert ISO string to time string (HH:MM:SS)
      const checkInTimeString = getISTTimeString(checkInTime);

      const { data: inserted, error: insertError } = await supabase
        .from("daily_work_log")
        .insert([
          {
            employee_id: employee.id,
            date: today,
            check_in: checkInTimeString,
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

      // Attendance Update using server time
      const istNow = await fetchServerTime();
      const month = istNow.getMonth() + 1;
      const year = istNow.getFullYear();

      const { data: attendance, error: attErr } = await supabase
        .from("attendance")
        .select("*")
        .eq("employee_id", employee.id)
        .eq("month", month)
        .eq("year", year)
        .maybeSingle();

      if (attendance) {
        await supabase
          .from("attendance")
          .update({ working_days: attendance.working_days + 1 })
          .eq("id", attendance.id);
      } else {
        await supabase.from("attendance").insert([
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
      }

      return NextResponse.json({
        message: "Checked in successfully",
        data: inserted,
      });
    }

    if (checkOutTime && workType && workDescription) {
      // Handle CHECK-OUT and update existing entry
      if (!existingEntry) {
        return NextResponse.json(
          { error: "Check-in entry not found" },
          { status: 400 }
        );
      }

      // Convert checkout time to IST time string
      const checkOutTimeString = getISTTimeString(checkOutTime);

      // Calculate hours worked using the ISO strings
      const checkInDate = new Date(checkInTime);
      const checkOutDate = new Date(checkOutTime);

      const hoursWorked = (
        (checkOutDate.getTime() - checkInDate.getTime()) /
        (1000 * 60 * 60)
      ).toFixed(2);

      const { data: updated, error: updateError } = await supabase
        .from("daily_work_log")
        .update({
          check_out: checkOutTimeString,
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
