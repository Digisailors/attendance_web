import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Validate environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase environment variables:", {
    url: !!supabaseUrl,
    serviceKey: !!supabaseServiceKey,
  })
}

const supabase = createClient(supabaseUrl!, supabaseServiceKey!, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

export async function GET(request: NextRequest) {
  try {
    console.log("=== API: Fetching employees ===")

    // Parse URL search params
    const searchParams = request.nextUrl.searchParams
    const month = Number.parseInt(searchParams.get("month") || (new Date().getMonth() + 1).toString())
    const year = Number.parseInt(searchParams.get("year") || new Date().getFullYear().toString())
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "10")
    const offset = (page - 1) * limit

    console.log("Query parameters:", { month, year, page, limit, offset })

    // Test Supabase connection first
    const { error: testError } = await supabase.from("employees").select("id").limit(1)

    if (testError) {
      console.error("Supabase connection test failed:", testError)
      return NextResponse.json(
        {
          error: "Database connection failed",
          details: testError.message,
        },
        { status: 500 },
      )
    }

    // Get total count of active employees
    const { count: totalCount, error: countError } = await supabase
      .from("employees")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true)

    if (countError) {
      console.error("Error getting employee count:", countError)
      return NextResponse.json(
        {
          error: "Failed to get employee count",
          details: countError.message,
        },
        { status: 500 },
      )
    }

    // First, try to get employees with attendance data for the specific month/year
    const { data: employeesWithAttendance, error: attendanceQueryError } = await supabase
      .from("employees")
      .select(`
        id,
        employee_id,
        name,
        designation,
        work_mode,
        phone_number,
        email_address,
        address,
        date_of_joining,
        experience,
        status,
        is_active,
        attendance!inner(
          total_days,
          working_days,
          permissions,
          leaves,
          missed_days,
          month,
          year
        )
      `)
      .eq("is_active", true)
      .eq("attendance.month", month)
      .eq("attendance.year", year)
      .order("name")
      .range(offset, offset + limit - 1)

    console.log("Employees with attendance query result:", {
      count: employeesWithAttendance?.length || 0,
      error: attendanceQueryError?.message || "none",
    })

    let finalEmployees = employeesWithAttendance || []
    let hasAttendanceData = true

    // If no employees found with attendance data, get all employees
    if (!employeesWithAttendance || employeesWithAttendance.length === 0) {
      console.log("No employees found with attendance data, fetching all employees...")
      hasAttendanceData = false

      const { data: allEmployees, error: allEmployeesError } = await supabase
        .from("employees")
        .select(`
          id,
          employee_id,
          name,
          designation,
          work_mode,
          phone_number,
          email_address,
          address,
          date_of_joining,
          experience,
          status,
          is_active
        `)
        .eq("is_active", true)
        .order("name")
        .range(offset, offset + limit - 1)

      if (allEmployeesError) {
        console.error("Error fetching all employees:", allEmployeesError)
        return NextResponse.json(
          {
            error: "Failed to fetch employees",
            details: allEmployeesError.message,
          },
          { status: 500 },
        )
      }

      finalEmployees = allEmployees || []
    }

    // Transform data to match frontend interface
    const transformedEmployees = finalEmployees.map((employee) => {
      let attendance = null

      if (hasAttendanceData && employee.attendance) {
        attendance = Array.isArray(employee.attendance) ? employee.attendance[0] : employee.attendance
      }

      return {
        id: employee.employee_id,
        name: employee.name,
        designation: employee.designation,
        workMode: employee.work_mode,
        totalDays: attendance?.total_days || 28,
        workingDays: attendance?.working_days || 0,
        permissions: attendance?.permissions || 0,
        leaves: attendance?.leaves || 0,
        missedDays: attendance?.missed_days || 0,
        status: employee.status,
        phoneNumber: employee.phone_number,
        emailAddress: employee.email_address,
        address: employee.address,
        dateOfJoining: employee.date_of_joining,
        experience: employee.experience,
      }
    })

    console.log("Successfully transformed employees:", transformedEmployees.length)

    const totalPages = Math.ceil((totalCount || 0) / limit)

    return NextResponse.json({
      employees: transformedEmployees,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount: totalCount || 0,
        limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
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

export async function POST(request: NextRequest) {
  try {
    console.log("=== API: Creating employee ===")

    const body = await request.json()
    console.log("Request body:", body)

    // Insert employee
    const { data: newEmployee, error: insertError } = await supabase
      .from("employees")
      .insert([
        {
          employee_id: body.id,
          name: body.name,
          designation: body.designation,
          work_mode: body.workMode,
          phone_number: body.phoneNumber,
          email_address: body.emailAddress,
          address: body.address,
          date_of_joining: body.dateOfJoining,
          experience: body.experience,
          status: body.status || "Active",
        },
      ])
      .select()
      .single()

    if (insertError) {
      console.error("Error creating employee:", insertError)
      if (insertError.code === "23505") {
        return NextResponse.json(
          {
            error: "Employee ID or email already exists",
          },
          { status: 400 },
        )
      }
      return NextResponse.json(
        {
          error: "Failed to create employee",
          details: insertError.message,
        },
        { status: 500 },
      )
    }

    // Create attendance record for current month
    const currentMonth = new Date().getMonth() + 1
    const currentYear = new Date().getFullYear()

    const { error: attendanceError } = await supabase.from("attendance").insert([
      {
        employee_id: newEmployee.id,
        month: currentMonth,
        year: currentYear,
        total_days: body.totalDays || 28,
        working_days: body.workingDays || 0,
        permissions: body.permissions || 0,
        leaves: body.leaves || 0,
        missed_days: body.missedDays || 0,
      },
    ])

    if (attendanceError) {
      console.error("Error creating attendance record:", attendanceError)
      // Don't fail the request as employee is already created
    }

    console.log("Employee created successfully:", newEmployee.employee_id)

    return NextResponse.json({
      message: "Employee created successfully",
      employee: {
        id: newEmployee.employee_id,
        name: newEmployee.name,
        designation: newEmployee.designation,
        workMode: newEmployee.work_mode,
        status: newEmployee.status,
      },
    })
  } catch (error) {
    console.error("Error in POST:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
