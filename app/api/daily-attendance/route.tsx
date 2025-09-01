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

    // 3️⃣ Merge
    let merged = employees.map((emp) => {
      const log = logs.find((l) => l.employee_id === emp.id);

      return {
        id: emp.employee_id,
        name: emp.name,
        designation: emp.designation,
        workMode: emp.work_mode,
        attendanceStatus: log?.status || "Absent",
        checkInTime: log?.check_in || null,
        checkOutTime: log?.check_out || null,
        totalHours: log?.hours || 0,
        project: log?.project || null,
        description: log?.description || null,
      };
    });

    // 4️⃣ Apply filters independently
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

    // 5️⃣ Summary
    const presentCount = merged.filter((m) => m.attendanceStatus === "Present").length;
    const absentCount = merged.filter((m) => m.attendanceStatus === "Absent").length;
    const lateCount = merged.filter((m) => m.attendanceStatus === "Late").length;

    return NextResponse.json({
      date: selectedDate,
      employees: merged,
      summary: {
        totalEmployees: merged.length,
        presentCount,
        absentCount,
        lateCount,
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
