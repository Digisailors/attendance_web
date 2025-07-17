// app/api/employees/profile/route.ts
import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const email = searchParams.get('email')

    if (!email) {
      return NextResponse.json({ error: "Email parameter is required" }, { status: 400 })
    }

    // Get employee by email
    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .select("*")
      .eq("email_address", email)
      .eq("is_active", true)
      .single()

    if (employeeError || !employee) {
      console.error("Employee not found:", employeeError)
      return NextResponse.json({ error: "Employee not found" }, { status: 404 })
    }

    // Return employee data
    return NextResponse.json({
      id: employee.id,
      employee_id: employee.employee_id,
      name: employee.name,
      email_address: employee.email_address,
      designation: employee.designation,
      work_mode: employee.work_mode,
      status: employee.status,
      phone_number: employee.phone_number,
      address: employee.address,
      date_of_joining: employee.date_of_joining,
      experience: employee.experience
    })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}