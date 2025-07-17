import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log("=== API: Creating work log entry ===")
    const employeeId = params.id
    const body = await request.json()
    console.log("Request body:", body)

    const { checkInTime, checkOutTime, workType, workDescription } = body

    // Validate required fields
    if (!checkInTime || !checkOutTime || !workType || !workDescription) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Get employee internal ID
    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .select("id, name")
      .eq("employee_id", employeeId)
      .single()

    if (employeeError || !employee) {
      console.error("Employee not found:", employeeError)
      return NextResponse.json({ error: "Employee not found" }, { status: 404 })
    }

    // Calculate hours worked
    const checkIn = new Date(checkInTime)
    const checkOut = new Date(checkOutTime)
    const hoursWorked = ((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60)).toFixed(2)

    // Get today's date
    const today = new Date().toISOString().split("T")[0]

    // Check if entry already exists for today
    const { data: existingEntry, error: checkError } = await supabase
      .from("daily_work_log")
      .select("id")
      .eq("employee_id", employee.id)
      .eq("date", today)
      .maybeSingle()

    let workLogData
    if (existingEntry) {
      // Update existing entry
      const { data: updatedEntry, error: updateError } = await supabase
        .from("daily_work_log")
        .update({
          check_in: checkIn.toTimeString().split(" ")[0],
          check_out: checkOut.toTimeString().split(" ")[0],
          hours: Number.parseFloat(hoursWorked),
          project: workType,
          status: "Present",
          description: workDescription,
        })
        .eq("id", existingEntry.id)
        .select()
        .single()

      if (updateError) {
        console.error("Error updating work log:", updateError)
        return NextResponse.json(
          { error: "Failed to update work log entry", details: updateError.message },
          { status: 500 },
        )
      }
      workLogData = updatedEntry
    } else {
      // Create new entry
      const { data: newEntry, error: insertError } = await supabase
        .from("daily_work_log")
        .insert([
          {
            employee_id: employee.id,
            date: today,
            check_in: checkIn.toTimeString().split(" ")[0],
            check_out: checkOut.toTimeString().split(" ")[0],
            hours: Number.parseFloat(hoursWorked),
            project: workType,
            status: "Present",
            description: workDescription,
          },
        ])
        .select()
        .single()

      if (insertError) {
        console.error("Error creating work log:", insertError)
        return NextResponse.json(
          { error: "Failed to create work log entry", details: insertError.message },
          { status: 500 },
        )
      }
      workLogData = newEntry
    }

    // Update attendance record for current month
    const currentMonth = new Date().getMonth() + 1
    const currentYear = new Date().getFullYear()

    // Get or create attendance record
    const { data: attendance, error: attendanceError } = await supabase
      .from("attendance")
      .select("*")
      .eq("employee_id", employee.id)
      .eq("month", currentMonth)
      .eq("year", currentYear)
      .maybeSingle()

    if (attendance) {
      // Update working days count (only if this is a new entry, not an update)
      if (!existingEntry) {
        const { error: updateAttendanceError } = await supabase
          .from("attendance")
          .update({
            working_days: attendance.working_days + 1,
          })
          .eq("id", attendance.id)

        if (updateAttendanceError) {
          console.error("Error updating attendance:", updateAttendanceError)
        }
      }
    } else {
      // Create new attendance record
      const { error: createAttendanceError } = await supabase.from("attendance").insert([
        {
          employee_id: employee.id,
          month: currentMonth,
          year: currentYear,
          total_days: 30, // Default total days
          working_days: 1,
          permissions: 0,
          leaves: 0,
          missed_days: 0,
        },
      ])

      if (createAttendanceError) {
        console.error("Error creating attendance record:", createAttendanceError)
      }
    }

    console.log("Work log entry saved successfully")
    return NextResponse.json({
      message: "Work log entry saved successfully",
      workLog: workLogData,
    })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
