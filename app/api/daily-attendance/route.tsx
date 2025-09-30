import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date");
    const searchQuery = searchParams.get("search")?.toLowerCase() || "";
    const workModeFilter = searchParams.get("workMode");
    const attendanceFilter = searchParams.get("attendanceStatus");

    if (!dateParam) {
      return NextResponse.json(
        { error: "Missing 'date' query parameter" },
        { status: 400 }
      );
    }

    const dateObj = new Date(dateParam);
    if (isNaN(dateObj.getTime())) {
      return NextResponse.json(
        { error: "Invalid date format. Use YYYY-MM-DD" },
        { status: 400 }
      );
    }

    const selectedDate = dateObj.toISOString().split("T")[0];

    // 1️⃣ Fetch employees
    const { data: employees, error: empError } = await supabase
      .from("employees")
      .select("id, employee_id, name, designation, work_mode");

    if (empError) throw empError;

    // 2️⃣ Fetch work logs
    const { data: logs, error: logError } = await supabase
      .from("daily_work_log")
      .select("*")
      .eq("date", selectedDate);

    if (logError) throw logError;

    // 🆕 3️⃣ Fetch leave requests (Pending Team Lead status) for this date
    // Check if selectedDate falls between start_date and end_date
    const { data: leaveRequests, error: leaveError } = await supabase
      .from("leave_requests")
      .select("employee_id, leave_type, status, start_date, end_date")
      .eq("status", "Pending Team Lead")
      .lte("start_date", selectedDate) // start_date <= selectedDate
      .gte("end_date", selectedDate); // end_date >= selectedDate

    if (leaveError) {
      console.error("Error fetching leave requests:", leaveError);
    }

    // Log for debugging
    console.log(`Checking leaves for date: ${selectedDate}`);
    console.log(
      `Found ${leaveRequests?.length || 0} pending leaves:`,
      leaveRequests
    );

    // Create a Set of employee IDs who are on leave
    const employeesOnLeave = new Set(
      leaveRequests?.map((leave) => leave.employee_id) || []
    );

    console.log(`Employees on leave:`, Array.from(employeesOnLeave));

    // 4️⃣ Merge
    let merged = employees.map((emp) => {
      const log = logs.find((l) => l.employee_id === emp.id);

      let attendanceStatus = "Absent"; // default

      // 🆕 Check if employee is on approved leave first
      if (employeesOnLeave.has(emp.id)) {
        attendanceStatus = "Leave";
      } else if (log) {
        // Original logic for determining status from work log
        const checkIn = log.check_in ? new Date(log.check_in) : null;
        const checkOut = log.check_out ? new Date(log.check_out) : null;

        if (!checkIn && !checkOut) {
          attendanceStatus = "Absent"; // Changed: if no check-in/out, it's absent (not leave)
        } else if (checkIn && !checkOut) {
          attendanceStatus = "Missed"; // checked in but didn't check out
        } else if (checkIn && checkOut) {
          const nineAM = new Date(checkIn);
          nineAM.setHours(9, 0, 0, 0); // 9:00 AM cutoff

          if (checkIn > nineAM) {
            attendanceStatus = "Late";
          } else {
            attendanceStatus = "Present";
          }
        }
      }

      return {
        id: emp.employee_id,
        name: emp.name,
        designation: emp.designation,
        workMode: emp.work_mode,
        attendanceStatus,
        checkInTime: log?.check_in || null,
        checkOutTime: log?.check_out || null,
        totalHours: log?.hours || 0,
        project: log?.project || null,
        description: log?.description || null,
      };
    });

    // 5️⃣ Apply filters independently
    if (searchQuery) {
      merged = merged.filter(
        (emp) =>
          emp.name.toLowerCase().includes(searchQuery) ||
          emp.id.toLowerCase().includes(searchQuery) ||
          emp.designation.toLowerCase().includes(searchQuery)
      );
    }

    if (workModeFilter) {
      merged = merged.filter((emp) => emp.workMode === workModeFilter);
    }

    if (attendanceFilter) {
      merged = merged.filter(
        (emp) => emp.attendanceStatus === attendanceFilter
      );
    }

    // 6️⃣ Summary
    const presentCount = merged.filter(
      (m) => m.attendanceStatus === "Present"
    ).length;
    const lateCount = merged.filter(
      (m) => m.attendanceStatus === "Late"
    ).length;
    const missedCount = merged.filter(
      (m) => m.attendanceStatus === "Missed"
    ).length;
    const leaveCount = merged.filter(
      (m) => m.attendanceStatus === "Leave"
    ).length;
    const absentCount = merged.filter(
      (m) => m.attendanceStatus === "Absent"
    ).length;

    return NextResponse.json({
      date: selectedDate,
      employees: merged,
      summary: {
        totalEmployees: merged.length,
        presentCount,
        lateCount,
        missedCount,
        leaveCount,
        absentCount,
        date: selectedDate,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? "Server error" },
      { status: 500 }
    );
  }
}
