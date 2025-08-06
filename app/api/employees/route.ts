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
    console.log("🚀 === API: Starting employee search ===")

    // Parse URL search params
    const searchParams = request.nextUrl.searchParams
    const month = Number.parseInt(searchParams.get("month") || (new Date().getMonth() + 1).toString())
    const year = Number.parseInt(searchParams.get("year") || new Date().getFullYear().toString())
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "10")
    const offset = (page - 1) * limit

    // Search and filter parameters
    const searchTerm = searchParams.get("search")?.trim() || ""
    const workMode = searchParams.get("workMode")?.trim() || ""
    const status = searchParams.get("status")?.trim() || ""

    console.log("📋 === API Parameters ===")
    console.log({
      month,
      year,
      page,
      limit,
      offset,
      searchTerm: `"${searchTerm}"`,
      workMode: `"${workMode}"`,
      status: `"${status}"`,
      hasSearch: !!searchTerm,
      searchLength: searchTerm.length,
      searchType: typeof searchTerm
    })

    let employees: any[] = []
    let totalCount = 0

    if (searchTerm && searchTerm.length > 0) {
      console.log(`🔍 === SEARCH MODE: "${searchTerm}" ===`)
      
      try {
        // Create a more comprehensive search query
        let baseQuery = supabase
          .from("employees")
          .select("*")
          .eq("is_active", true)

        // Use OR condition with multiple ilike searches
        const searchQuery = baseQuery.or(`name.ilike.%${searchTerm}%,employee_id.ilike.%${searchTerm}%,designation.ilike.%${searchTerm}%`)

        // Apply additional filters
        if (workMode && workMode !== "All Modes") {
          searchQuery.eq("work_mode", workMode)
          console.log(`🏢 Applied work mode filter: ${workMode}`)
        }

        if (status && status !== "All Status") {
          searchQuery.eq("status", status)
          console.log(`📊 Applied status filter: ${status}`)
        }

        // Execute search query
        const { data: searchResults, error: searchError } = await searchQuery.order("name")

        if (searchError) {
          console.error("❌ Search query error:", searchError)
          throw searchError
        }

        console.log(`✅ Search found ${searchResults?.length || 0} results`)

        if (searchResults) {
          // Log found employees
          searchResults.forEach((emp, idx) => {
            console.log(`  ${idx + 1}. ${emp.employee_id} - "${emp.name}" (${emp.designation})`)
          })

          totalCount = searchResults.length
          
          // Apply pagination to search results
          employees = searchResults.slice(offset, offset + limit)
          
          console.log(`📄 Paginated results: showing ${employees.length} of ${totalCount} (page ${page})`)
        } else {
          employees = []
          totalCount = 0
        }

      } catch (searchErr) {
        console.error("❌ Search error:", searchErr)
        employees = []
        totalCount = 0
      }

    } else {
      console.log("📂 === NO SEARCH - FETCHING ALL ===")
      
      try {
        // Build base query for no search
        let countQuery = supabase
          .from("employees")
          .select("*", { count: "exact", head: true })
          .eq("is_active", true)

        let dataQuery = supabase
          .from("employees")
          .select("*")
          .eq("is_active", true)

        // Apply filters if provided
        if (workMode && workMode !== "All Modes") {
          countQuery = countQuery.eq("work_mode", workMode)
          dataQuery = dataQuery.eq("work_mode", workMode)
          console.log(`🏢 Applied work mode filter: ${workMode}`)
        }

        if (status && status !== "All Status") {
          countQuery = countQuery.eq("status", status)
          dataQuery = dataQuery.eq("status", status)
          console.log(`📊 Applied status filter: ${status}`)
        }

        // Get count
        const { count, error: countError } = await countQuery

        if (countError) {
          console.error("❌ Count error:", countError)
          totalCount = 0
        } else {
          totalCount = count || 0
          console.log(`📊 Total employees found: ${totalCount}`)
        }

        // Get employees with pagination
        dataQuery = dataQuery
          .order("name")
          .range(offset, offset + limit - 1)

        const { data: allEmployeesData, error: employeesError } = await dataQuery

        if (employeesError) {
          console.error("❌ Employees fetch error:", employeesError)
          employees = []
        } else {
          employees = allEmployeesData || []
          console.log(`✅ Fetched ${employees.length} employees for page ${page}`)
          
          // Log employee details
          employees.forEach((emp, idx) => {
            console.log(`  ${idx + 1}. ${emp.employee_id} - "${emp.name}" (${emp.designation})`)
          })
        }

      } catch (fetchErr) {
        console.error("❌ Fetch error:", fetchErr)
        employees = []
        totalCount = 0
      }
    }

    console.log("📊 === RESULTS SUMMARY ===")
    console.log({
      finalEmployeeCount: employees.length,
      totalCount,
      page,
      totalPages: Math.ceil(totalCount / limit),
      hasSearch: !!searchTerm,
      searchTerm
    })

    // Get attendance data for found employees
    let attendanceMap = new Map()
    if (employees.length > 0) {
      const employeeIds = employees.map(emp => emp.id)
      console.log(`📈 Fetching attendance for ${employeeIds.length} employees...`)
      
      try {
        const { data: attendanceData, error: attendanceError } = await supabase
          .from("attendance")
          .select("*")
          .in("employee_id", employeeIds)
          .eq("month", month)
          .eq("year", year)

        if (attendanceError) {
          console.error("❌ Attendance fetch error:", attendanceError)
        } else {
          console.log(`✅ Found ${attendanceData?.length || 0} attendance records`)
          attendanceData?.forEach(attendance => {
            attendanceMap.set(attendance.employee_id, attendance)
          })
        }
      } catch (attErr) {
        console.error("❌ Attendance error:", attErr)
      }
    }

    // Transform data
    const transformedEmployees = employees.map((employee) => {
      const attendance = attendanceMap.get(employee.id)
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

    const totalPages = Math.ceil(totalCount / limit)

    console.log("🎯 === FINAL RESPONSE ===")
    console.log({
      transformedEmployeesCount: transformedEmployees.length,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        limit
      },
      searchDetails: {
        searchTerm,
        hasSearch: !!searchTerm
      }
    })

    const response = {
      employees: transformedEmployees,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
      debug: {
        searchTerm,
        hasSearch: !!searchTerm,
        totalCount,
        employeesReturned: transformedEmployees.length,
        filters: {
          workMode: workMode || 'none',
          status: status || 'none'
        }
      }
    }

    console.log("✅ Sending response with", transformedEmployees.length, "employees")
    return NextResponse.json(response)

  } catch (error) {
    console.error("💥 === API CRITICAL ERROR ===", error)
    console.error("Error details:", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined
    })
    
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
        employees: [],
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalCount: 0,
          limit: 10,
          hasNextPage: false,
          hasPreviousPage: false,
        }
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("🔨 === API: Creating employee ===")

    const body = await request.json()
    console.log("📝 Request body:", body)

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
      console.error("❌ Error creating employee:", insertError)
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
      console.error("⚠️ Error creating attendance record:", attendanceError)
      // Don't fail the request as employee is already created
    }

    console.log("✅ Employee created successfully:", newEmployee.employee_id)

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
    console.error("💥 Error in POST:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}