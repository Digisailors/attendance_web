import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log("=== API: Fetching employee details ===")
    
    const employeeId = params.id
    const searchParams = request.nextUrl.searchParams
    const month = Number.parseInt(searchParams.get("month") || "6")
    const year = Number.parseInt(searchParams.get("year") || "2024")
    
    console.log("Params:", { employeeId, month, year })
    
    // Get employee details
    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .select("*")
      .eq("employee_id", employeeId)
      .eq("is_active", true)
      .single()
    
    if (employeeError || !employee) {
      console.error("Employee not found:", employeeError)
      return NextResponse.json({ error: "Employee not found" }, { status: 404 })
    }
    
    // Get attendance data
    const { data: attendance, error: attendanceError } = await supabase
      .from("attendance")
      .select("*")
      .eq("employee_id", employee.id)
      .eq("month", month)
      .eq("year", year)
      .maybeSingle()
    
    // Get work log data
    const startDate = `${year}-${month.toString().padStart(2, "0")}-01`
    const nextMonth = month === 12 ? 1 : month + 1
    const nextYear = month === 12 ? year + 1 : year
    const endDate = `${nextYear}-${nextMonth.toString().padStart(2, "0")}-01`
    
    const { data: workLog, error: workLogError } = await supabase
      .from("daily_work_log")
      .select("*")
      .eq("employee_id", employee.id)
      .gte("date", startDate)
      .lt("date", endDate)
      .order("date", { ascending: false })
    
    // Transform data
    const employeeData = {
      id: employee.employee_id,
      name: employee.name,
      designation: employee.designation,
      workMode: employee.work_mode,
      status: employee.status,
      totalDays: attendance?.total_days || 28,
      workingDays: attendance?.working_days || 0,
      permissions: attendance?.permissions || 0,
      leaves: attendance?.leaves || 0,
      missedDays: attendance?.missed_days || 0,
      phoneNumber: employee.phone_number,
      emailAddress: employee.email_address,
      address: employee.address,
      dateOfJoining: employee.date_of_joining,
      experience: employee.experience,
    }
    
    const dailyWorkLog = (workLog || []).map((log) => ({
      date: new Date(log.date).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "2-digit",
      }),
      checkIn: log.check_in || "-",
      checkOut: log.check_out || "-",
      hours: log.hours ? `${log.hours}h` : "0h",
      project: log.project || "-",
      status: log.status,
      description: log.description || "-",
    }))
    
    return NextResponse.json({
      employee: employeeData,
      dailyWorkLog,
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

// PUT method for updating employee
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log("=== API: Updating employee ===")
    
    const employeeId = params.id
    const body = await request.json()
    
    console.log("Update data:", body)
    
    // Update employee in database
    const { data, error } = await supabase
      .from("employees")
      .update({
        name: body.name,
        designation: body.designation,
        work_mode: body.workMode,
        status: body.status,
        phone_number: body.phoneNumber,
        email_address: body.emailAddress,
        address: body.address,
        date_of_joining: body.dateOfJoining,
        experience: body.experience,
        updated_at: new Date().toISOString(),
      })
      .eq("employee_id", employeeId)
      .select()
      .single()
    
    if (error) {
      console.error("Update error:", error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    
    // Transform response data
    const updatedEmployee = {
      id: data.employee_id,
      name: data.name,
      designation: data.designation,
      workMode: data.work_mode,
      status: data.status,
      phoneNumber: data.phone_number,
      emailAddress: data.email_address,
      address: data.address,
      dateOfJoining: data.date_of_joining,
      experience: data.experience,
    }
    
    return NextResponse.json({
      success: true,
      message: "Employee updated successfully",
      employee: updatedEmployee,
    })
  } catch (error) {
    console.error("PUT API error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

// DELETE method for deleting employee
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log("=== API: Deleting employee ===")
    
    const employeeId = params.id
    console.log("Deleting employee with ID:", employeeId)
    
    // First check if employee exists
    const { data: existingEmployee, error: findError } = await supabase
      .from("employees")
      .select("id, employee_id, name, is_active")
      .eq("employee_id", employeeId)
      .eq("is_active", true)
      .single()
    
    if (findError || !existingEmployee) {
      console.error("Employee not found:", findError)
      return NextResponse.json({ error: "Employee not found" }, { status: 404 })
    }
    
    console.log("Found employee:", existingEmployee)
    
    // Delete related records first (attendance and work logs)
    console.log("Deleting related attendance records...")
    const { error: attendanceDeleteError } = await supabase
      .from("attendance")
      .delete()
      .eq("employee_id", existingEmployee.id)
    
    if (attendanceDeleteError) {
      console.error("Error deleting attendance records:", attendanceDeleteError)
      // Continue with employee deletion even if attendance deletion fails
    }
    
    console.log("Deleting related work log records...")
    const { error: workLogDeleteError } = await supabase
      .from("daily_work_log")
      .delete()
      .eq("employee_id", existingEmployee.id)
    
    if (workLogDeleteError) {
      console.error("Error deleting work log records:", workLogDeleteError)
      // Continue with employee deletion even if work log deletion fails
    }
    
    // Now delete the employee record completely
    console.log("Deleting employee record...")
    const { data, error } = await supabase
      .from("employees")
      .delete()
      .eq("employee_id", employeeId)
      .select()
      .single()
    
    if (error) {
      console.error("Delete error:", error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    
    console.log("Successfully deleted employee completely:", existingEmployee.name)
    
    return NextResponse.json({
      success: true,
      message: `Employee ${existingEmployee.name} deleted successfully`,
    })
  } catch (error) {
    console.error("DELETE API error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}