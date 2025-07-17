import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const teamLeadId = searchParams.get("team_lead_id")

    if (!teamLeadId) {
      return NextResponse.json({ error: "Team lead ID is required" }, { status: 400 })
    }

    // Get team members with their internal UUIDs
    const { data: teamMembers, error: teamError } = await supabase
      .from("team_members")
      .select(`
        employee_id,
        employees!team_members_employee_id_fkey(
          id,
          employee_id
        )
      `)
      .eq("team_lead_id", teamLeadId)
      .eq("is_active", true)

    if (teamError) {
      console.error("Error fetching team members:", teamError)
      return NextResponse.json({ error: "Failed to fetch team members" }, { status: 500 })
    }

    // Extract internal UUIDs from team members
    const internalEmployeeIds = teamMembers?.map((member) => member.employee_id) || []

    if (internalEmployeeIds.length === 0) {
      return NextResponse.json({
        submissions: [],
        message: "No team members found for this team lead",
      })
    }

    // Get work submissions using internal UUIDs
    const { data: submissions, error: submissionError } = await supabase
      .from("work_submissions")
      .select(`
        *,
        employee:employees!work_submissions_employee_id_fkey(
          name,
          employee_id
        )
      `)
      .in("employee_id", internalEmployeeIds)
      .order("created_at", { ascending: false })

    if (submissionError) {
      console.error("Error fetching work submissions:", submissionError)
      return NextResponse.json({ error: "Failed to fetch work submissions" }, { status: 500 })
    }

    // Format the submissions data
    const formattedSubmissions =
      submissions?.map((submission) => ({
        id: submission.id,
        title: submission.title || submission.work_type,
        employee_name: submission.employee?.name || submission.employee_name || "Unknown",
        work_type: submission.work_type,
        work_description: submission.work_description,
        department: submission.department,
        priority: submission.priority,
        status: submission.status,
        submitted_date: submission.submitted_date,
        created_at: submission.created_at,
        employee: submission.employee,
      })) || []

    return NextResponse.json({
      submissions: formattedSubmissions,
      teamMemberCount: internalEmployeeIds.length,
    })
  } catch (error) {
    console.error("Error in work submission API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { employeeId, employeeName, workType, workDescription, department, priority = "Medium" } = body

    if (!employeeId || !workType || !workDescription) {
      return NextResponse.json(
        {
          error: "Missing required fields: employeeId, workType, workDescription",
        },
        { status: 400 },
      )
    }

    // Lookup employee internal UUID
    const { data: employeeRecord, error: lookupError } = await supabase
      .from("employees")
      .select("id")
      .eq("employee_id", employeeId)
      .single()

    if (lookupError || !employeeRecord) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 })
    }

    const internalEmployeeId = employeeRecord.id

    // Insert the work submission with internal UUID
    const { data, error } = await supabase
      .from("work_submissions")
      .insert({
        employee_id: internalEmployeeId, // Use internal UUID
        employee_name: employeeName,
        title: workType, // Add title field - using workType as title
        work_type: workType,
        work_description: workDescription,
        department: department,
        priority: priority,
        status: "Pending Team Lead",
        submitted_date: new Date().toISOString(),
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating work submission:", JSON.stringify(error, null, 2))
      return NextResponse.json({ error: "Failed to create work submission" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "Work submission created successfully",
      submission: data,
    })
  } catch (error) {
    console.error("Error in work submission POST:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}