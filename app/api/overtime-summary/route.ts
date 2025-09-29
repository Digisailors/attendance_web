import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);

    const employeeCode = url.searchParams.get("employeeId");
    const month = Number(url.searchParams.get("month"));
    const year = Number(url.searchParams.get("year"));

    console.log("🔍 Overtime API:", { employeeCode, month, year });

    if (!employeeCode || !month || !year) {
      return NextResponse.json(
        { error: "Missing parameters" },
        { status: 400 }
      );
    }

    // Get employee UUID
    const { data: employee, error: empError } = await supabase
      .from("employees")
      .select("id")
      .eq("employee_id", employeeCode)
      .single();

    if (empError || !employee) {
      console.error("Employee not found:", empError);
      return NextResponse.json({
        total_hours: 0,
        records_count: 0,
        records: [],
      });
    }

    const employeeUUID = employee.id;
    console.log("Found employee UUID:", employeeUUID);

    // Fetch all overtime records for this employee
    const { data: overtimeData, error: otError } = await supabase
      .from("overtime_requests")
      .select("*")
      .eq("employee_id", employeeUUID);

    if (otError) {
      console.error("❌ Overtime query error:", otError);
      return NextResponse.json({
        total_hours: 0,
        records_count: 0,
        records: [],
        error_details: otError.message,
      });
    }

    console.log("Raw overtime data:", overtimeData);

    if (!overtimeData || overtimeData.length === 0) {
      console.log("No overtime records found");
      return NextResponse.json({
        total_hours: 0,
        records_count: 0,
        records: [],
      });
    }

    // Filter and process records
    let totalHours = 0;
    let recordsCount = 0;
    const processedRecords = [];

    overtimeData.forEach((record) => {
      // Use ot_date as the primary date field
      const recordDate =
        record.ot_date ||
        record.request_date ||
        record.date ||
        record.work_date ||
        record.created_at;

      if (recordDate) {
        const date = new Date(recordDate);
        const recordMonth = date.getMonth() + 1;
        const recordYear = date.getFullYear();

        // Check if record is from the requested month/year
        if (recordMonth === month && recordYear === year) {
          const status = record.status?.toLowerCase();

          // Only include approved records
          if (status === "approved" || status === "approve") {
            // Use total_hours from the record
            const hours = Number(record.total_hours) || 0;
            totalHours += hours;
            recordsCount++;

            // Add to records array for daily breakdown
            processedRecords.push({
              ot_date: record.ot_date, // Keep original date format (YYYY-MM-DD)
              total_hours: hours,
              status: record.status,
              start_time: record.start_time,
              end_time: record.end_time,
              reason: record.reason,
            });

            console.log("✅ Added record:", {
              date: record.ot_date,
              hours,
              status: record.status,
            });
          } else {
            console.log("⚠️ Skipped non-approved record:", {
              date: record.ot_date,
              status: record.status,
            });
          }
        }
      }
    });

    const response = {
      total_hours: Number(totalHours.toFixed(2)),
      records_count: recordsCount,
      records: processedRecords, // THIS IS THE KEY PART
      debug_info: {
        employee_uuid: employeeUUID,
        total_records_found: overtimeData.length,
        filtered_approved_records: recordsCount,
        month_year: `${month}/${year}`,
      },
    };

    console.log("✅ Overtime response:", response);
    return NextResponse.json(response);
  } catch (error) {
    console.error("❌ Unexpected error:", error);
    return NextResponse.json({
      total_hours: 0,
      records_count: 0,
      records: [],
      error: "Server error",
    });
  }
}
