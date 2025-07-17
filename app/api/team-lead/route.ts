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

// Types for better type safety
interface Employee {
  id: string;
  employee_id: string;
  name: string;
  designation: string | null;
  work_mode: 'Office' | 'WFH' | 'Hybrid' | null;
  status: 'Active' | 'Warning' | 'On Leave' | null;
  phone_number: string | null;
  email_address: string | null;
  address: string | null;
  date_of_joining: string | null;
  experience: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface TeamMember {
  id: string;
  employee_id: string;
  team_lead_id: string;
  added_date: string;
  is_active: boolean;
  employee_external_id: string;
  employee_name: string;
  designation: string | null;
  work_mode: 'Office' | 'WFH' | 'Hybrid' | null;
  status: 'Active' | 'Warning' | 'On Leave' | null;
  phone_number: string | null;
  email_address: string | null;
  address: string | null;
  date_of_joining: string | null;
  experience: string | null;
  employee_created_at: string;
  employee_updated_at: string;
}

// GET /api/team-lead - Get team members for a specific team lead
export async function GET(request: NextRequest) {
  try {
    console.log("=== API: Fetching team data ===")

    const searchParams = request.nextUrl.searchParams
    const teamLeadId = searchParams.get("team_lead_id")
    const getAvailableEmployees = searchParams.get("get_available") === "true"
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10")
    const search = searchParams.get("search") || ""
    const workMode = searchParams.get("work_mode") || ""
    const status = searchParams.get("status") || ""

    if (!teamLeadId) {
      return NextResponse.json(
        { error: "Team lead ID is required" },
        { status: 400 }
      )
    }

    console.log("Team lead ID:", teamLeadId)

    // Verify team lead exists
    const { data: teamLeadEmployee, error: teamLeadError } = await supabase
      .from("employees")
      .select("id, employee_id, name, designation")
      .eq("employee_id", teamLeadId)
      .eq("is_active", true)
      .single()

    if (teamLeadError || !teamLeadEmployee) {
      console.error("Team lead not found:", teamLeadError)
      return NextResponse.json(
        { error: "Team lead not found or inactive" },
        { status: 404 }
      )
    }

    console.log("Team lead found:", teamLeadEmployee)

    // If requesting available employees
    if (getAvailableEmployees) {
      console.log("Fetching available employees for team lead:", teamLeadId)
      
      // Get existing team member employee IDs for this team lead
      const { data: existingTeamMembers, error: teamMembersError } = await supabase
        .from("team_members")
        .select("employee_id")
        .eq("team_lead_id", teamLeadId)
        .eq("is_active", true)

      if (teamMembersError) {
        console.error("Error fetching existing team members:", teamMembersError)
        return NextResponse.json(
          { error: "Failed to fetch existing team members" },
          { status: 500 }
        )
      }

      // Get existing team member internal IDs
      const existingEmployeeIds = existingTeamMembers?.map(tm => tm.employee_id) || []
      
      // Add team lead's internal ID to exclude list
      existingEmployeeIds.push(teamLeadEmployee.id)

      // Calculate offset for pagination
      const offset = (page - 1) * limit

      // Build base query
      let query = supabase
        .from("employees")
        .select(`
          id,
          employee_id,
          name,
          designation,
          work_mode,
          status,
          phone_number,
          email_address,
          address,
          date_of_joining,
          experience,
          created_at,
          updated_at
        `, { count: 'exact' })
        .eq("is_active", true)
        .order("name", { ascending: true })

      // Apply search filter
      if (search) {
        query = query.or(`name.ilike.%${search}%,designation.ilike.%${search}%,employee_id.ilike.%${search}%`)
      }

      // Apply work mode filter
      if (workMode && workMode !== "All Modes") {
        query = query.eq("work_mode", workMode)
      }

      // Apply status filter
      if (status && status !== "All Status") {
        query = query.eq("status", status)
      }

      // Exclude existing team members and team lead
      if (existingEmployeeIds.length > 0) {
        query = query.not("id", "in", `(${existingEmployeeIds.join(",")})`)
      }

      // Apply pagination
      query = query.range(offset, offset + limit - 1)

      const { data: availableEmployees, error: employeesError, count } = await query

      if (employeesError) {
        console.error("Error fetching available employees:", employeesError)
        return NextResponse.json(
          { error: "Failed to fetch available employees" },
          { status: 500 }
        )
      }

      // Transform data to match frontend interface
      const transformedEmployees = availableEmployees?.map((employee) => ({
        id: employee.employee_id,
        name: employee.name,
        designation: employee.designation,
        workMode: employee.work_mode,
        status: employee.status,
        phoneNumber: employee.phone_number,
        emailAddress: employee.email_address,
        address: employee.address,
        dateOfJoining: employee.date_of_joining,
        experience: employee.experience,
        createdAt: employee.created_at,
        updatedAt: employee.updated_at,
      })) || []

      // Calculate pagination info
      const totalCount = count || 0
      const totalPages = Math.ceil(totalCount / limit)
      const hasNextPage = page < totalPages
      const hasPreviousPage = page > 1

      const pagination = {
        currentPage: page,
        totalPages,
        totalCount,
        limit,
        hasNextPage,
        hasPreviousPage,
      }

      console.log("Successfully fetched available employees:", transformedEmployees.length)

      return NextResponse.json({
        employees: transformedEmployees,
        pagination,
        teamLeadInfo: {
          id: teamLeadEmployee.employee_id,
          name: teamLeadEmployee.name,
          designation: teamLeadEmployee.designation,
        },
      })
    }

    // Get team members using the view for better performance and reliability
    console.log("Fetching team members for team lead:", teamLeadId)
    
    const { data: teamMembers, error } = await supabase
      .from("team_members_with_employees")
      .select("*")
      .eq("team_lead_id", teamLeadId)
      .eq("is_active", true)
      .order("added_date", { ascending: false })

    if (error) {
      console.error("Error fetching team members:", error)
      return NextResponse.json(
        {
          error: "Failed to fetch team members",
          details: error.message,
        },
        { status: 500 }
      )
    }

    console.log("Raw team members data:", JSON.stringify(teamMembers, null, 2))

    // Transform team members to match frontend interface
    const transformedTeamMembers = (teamMembers || []).map((member: TeamMember) => {
      return {
        id: member.id,
        employee_id: member.employee_id,
        team_lead_id: member.team_lead_id,
        added_date: member.added_date,
        is_active: member.is_active,
        employee: {
          id: member.employee_external_id, // Use employee_external_id for frontend ID
          name: member.employee_name,
          designation: member.designation,
          workMode: member.work_mode,
          status: member.status,
          phoneNumber: member.phone_number,
          emailAddress: member.email_address,
          address: member.address,
          dateOfJoining: member.date_of_joining,
          experience: member.experience,
          createdAt: member.employee_created_at,
          updatedAt: member.employee_updated_at,
        }
      }
    })

    console.log("Transformed team members:", JSON.stringify(transformedTeamMembers, null, 2))
    console.log("Successfully fetched team members:", transformedTeamMembers.length)

    return NextResponse.json({
      teamMembers: transformedTeamMembers,
      count: transformedTeamMembers.length,
      teamLeadInfo: {
        id: teamLeadEmployee.employee_id,
        name: teamLeadEmployee.name,
        designation: teamLeadEmployee.designation,
      },
    })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

// POST /api/team-lead - Add a team member
export async function POST(request: NextRequest) {
  try {
    console.log("=== API: Adding team member ===")

    const body = await request.json()
    const { employee_id, team_lead_id } = body

    if (!employee_id || !team_lead_id) {
      return NextResponse.json(
        { error: "Employee ID and Team Lead ID are required" },
        { status: 400 }
      )
    }

    console.log("Adding team member:", { employee_id, team_lead_id })

    // Check if employee exists and get internal ID
    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .select("id, employee_id, name, designation")
      .eq("employee_id", employee_id)
      .eq("is_active", true)
      .single()

    if (employeeError || !employee) {
      console.error("Employee not found:", employeeError)
      return NextResponse.json(
        { error: "Employee not found or inactive" },
        { status: 404 }
      )
    }

    // Check if team lead exists
    const { data: teamLead, error: teamLeadError } = await supabase
      .from("employees")
      .select("id, employee_id, name, designation")
      .eq("employee_id", team_lead_id)
      .eq("is_active", true)
      .single()

    if (teamLeadError || !teamLead) {
      console.error("Team lead not found:", teamLeadError)
      return NextResponse.json(
        { error: "Team lead not found or inactive" },
        { status: 404 }
      )
    }

    // Check if employee is already in this team
    const { data: existingMember, error: checkError } = await supabase
      .from("team_members")
      .select("id")
      .eq("employee_id", employee.id)
      .eq("team_lead_id", team_lead_id)
      .eq("is_active", true)

    if (checkError) {
      console.error("Error checking existing member:", checkError)
      return NextResponse.json(
        { error: "Failed to check existing team member" },
        { status: 500 }
      )
    }

    if (existingMember && existingMember.length > 0) {
      return NextResponse.json(
        { error: "Employee is already a member of this team" },
        { status: 400 }
      )
    }

    // Add team member
    const { data: newTeamMember, error: insertError } = await supabase
      .from("team_members")
      .insert([
        {
          employee_id: employee.id,
          team_lead_id: team_lead_id,
          added_date: new Date().toISOString(),
          is_active: true,
        },
      ])
      .select()
      .single()

    if (insertError) {
      console.error("Error adding team member:", insertError)
      return NextResponse.json(
        {
          error: "Failed to add team member",
          details: insertError.message,
        },
        { status: 500 }
      )
    }

    console.log("Team member added successfully:", newTeamMember.id)

    return NextResponse.json({
      message: "Team member added successfully",
      teamMember: {
        id: newTeamMember.id,
        employee_id: newTeamMember.employee_id,
        team_lead_id: newTeamMember.team_lead_id,
        added_date: newTeamMember.added_date,
        employee: {
          id: employee.employee_id,
          name: employee.name,
          designation: employee.designation,
        },
      },
    })
  } catch (error) {
    console.error("Error in POST:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

// DELETE /api/team-lead - Remove a team member
export async function DELETE(request: NextRequest) {
  try {
    console.log("=== API: Removing team member ===")

    const body = await request.json()
    const { team_member_id } = body

    if (!team_member_id) {
      return NextResponse.json(
        { error: "Team member ID is required" },
        { status: 400 }
      )
    }

    console.log("Removing team member:", team_member_id)

    // Update team member to inactive instead of deleting
    const { data: updatedTeamMember, error: updateError } = await supabase
      .from("team_members")
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", team_member_id)
      .select()
      .single()

    if (updateError) {
      console.error("Error removing team member:", updateError)
      return NextResponse.json(
        {
          error: "Failed to remove team member",
          details: updateError.message,
        },
        { status: 500 }
      )
    }

    if (!updatedTeamMember) {
      return NextResponse.json(
        { error: "Team member not found" },
        { status: 404 }
      )
    }

    console.log("Team member removed successfully:", updatedTeamMember.id)

    return NextResponse.json({
      message: "Team member removed successfully",
      teamMember: updatedTeamMember,
    })
  } catch (error) {
    console.error("Error in DELETE:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}