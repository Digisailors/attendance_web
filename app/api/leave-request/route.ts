import { type NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient()

  try {
    const body = await request.json()
    const { employeeId, leaveType, startDate, endDate, reason } = body

    if (!employeeId || !leaveType || !startDate || !endDate || !reason) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Get employee details
    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .select("id, name, email_address, manager_id")
      .eq("id", employeeId)
      .single()

    if (employeeError) {
      console.error("Employee fetch error:", employeeError)
      return NextResponse.json({ error: "Employee not found" }, { status: 404 })
    }

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 })
    }

    // Get team lead for this employee
    const { data: teamMember, error: teamError } = await supabase
      .from("team_members")
      .select("team_lead_id")
      .eq("employee_id", employeeId)
      .eq("is_active", true)
      .single()

    if (teamError) {
      console.error("Team member fetch error:", teamError)
      return NextResponse.json({ error: "Team lead not found for this employee" }, { status: 404 })
    }

    if (!teamMember) {
      return NextResponse.json({ error: "Team lead not found for this employee" }, { status: 404 })
    }

    // Insert leave request
    const { data: leaveRequest, error: insertError } = await supabase
      .from("leave_requests")
      .insert({
        employee_id: employeeId,
        employee_name: employee.name,
        employee_email: employee.email_address,
        team_lead_id: teamMember.team_lead_id,
        manager_id: employee.manager_id,
        leave_type: leaveType,
        start_date: startDate,
        end_date: endDate,
        reason: reason,
        status: "Pending Team Lead",
      })
      .select()
      .single()

    if (insertError) {
      console.error("Error inserting leave request:", insertError)
      return NextResponse.json({ error: "Failed to submit leave request" }, { status: 500 })
    }

    // Create notification for team lead
    const { error: notificationError } = await supabase.from("notifications").insert({
      recipient_type: "team-lead",
      recipient_id: teamMember.team_lead_id,
      title: "New Leave Request",
      message: `${employee.name} has submitted a leave request for ${leaveType}`,
      type: "leave_request",
      reference_id: leaveRequest.id,
    })

    if (notificationError) {
      console.error("Error creating notification:", notificationError)
    }

    return NextResponse.json({
      message: "Leave request submitted successfully",
      data: leaveRequest,
    })
  } catch (error) {
    console.error("Error in leave request API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const supabase = createServerSupabaseClient()

  try {
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get("employeeId")
    const teamLeadId = searchParams.get("teamLeadId")
    const managerId = searchParams.get("managerId")
    const status = searchParams.get("status")

    console.log("GET leave requests params:", { employeeId, teamLeadId, managerId, status })

    let query = supabase
      .from("leave_requests")
      .select(`
        *,
        employee:employees!fk_employee_id(
          id, 
          name, 
          email_address, 
          designation, 
          phone_number, 
          address
        )
      `)
      .order("created_at", { ascending: false })

    if (employeeId) {
      query = query.eq("employee_id", employeeId)
    }

    if (teamLeadId) {
      query = query.eq("team_lead_id", teamLeadId)
    }

    if (managerId) {
      query = query.eq("manager_id", managerId)
    }

    if (status && status !== "All") {
      query = query.eq("status", status)
    }

    const { data, error } = await query

    if (error) {
      console.error("Error fetching leave requests:", error)
      return NextResponse.json(
        {
          error: "Failed to fetch leave requests",
          details: error.message,
        },
        { status: 500 },
      )
    }

    console.log(`Found ${data?.length || 0} leave requests`)
    return NextResponse.json({ data: data || [] })
  } catch (error) {
    console.error("Error in GET leave requests:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

export async function PATCH(request: NextRequest) {
  const supabase = createServerSupabaseClient()

  try {
    const body = await request.json()
    const { requestId, action, teamLeadId, managerId, comments, userType } = body

    console.log("PATCH leave request:", { requestId, action, userType, teamLeadId, managerId })

    if (!requestId || !action || !userType) {
      return NextResponse.json({ error: "Missing required fields: requestId, action, userType" }, { status: 400 })
    }

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: 'Invalid action. Use "approve" or "reject"' }, { status: 400 })
    }

    // Get the leave request details
    const { data: leaveRequest, error: fetchError } = await supabase
      .from("leave_requests")
      .select("*")
      .eq("id", requestId)
      .single()

    if (fetchError) {
      console.error("Error fetching leave request:", fetchError)
      return NextResponse.json({ error: "Leave request not found" }, { status: 404 })
    }

    if (!leaveRequest) {
      return NextResponse.json({ error: "Leave request not found" }, { status: 404 })
    }

    // Authorization check based on userType
    if (userType === "team-lead") {
      if (!teamLeadId || leaveRequest.team_lead_id !== teamLeadId) {
        return NextResponse.json({ error: "Unauthorized: Team Lead ID mismatch or missing" }, { status: 403 })
      }
      if (leaveRequest.status !== "Pending Team Lead") {
        return NextResponse.json(
          { error: `Request is not pending team lead approval (current status: ${leaveRequest.status})` },
          { status: 400 },
        )
      }
    } else if (userType === "manager") {
      if (!managerId || leaveRequest.manager_id !== managerId) {
        return NextResponse.json({ error: "Unauthorized: Manager ID mismatch or missing" }, { status: 403 })
      }
      if (leaveRequest.status !== "Pending Manager Approval") {
        return NextResponse.json(
          { error: `Request is not pending manager approval (current status: ${leaveRequest.status})` },
          { status: 400 },
        )
      }
    } else {
      return NextResponse.json({ error: "Invalid userType" }, { status: 400 })
    }

    // Determine new status and comments based on action and userType
    const updateData: any = {}
    let notificationTitle = ""
    let notificationMessage = ""
    let notificationRecipientId = leaveRequest.employee_id
    let notificationRecipientType = "employee"

    if (action === "approve") {
      if (userType === "team-lead") {
        updateData.status = "Pending Manager Approval"
        updateData.team_lead_comments = comments || null
        notificationTitle = "Leave Request Approved by Team Lead"
        notificationMessage = `${leaveRequest.employee_name}'s leave request for ${leaveRequest.leave_type} has been approved by their Team Lead and is now pending your approval.`
        notificationRecipientId = leaveRequest.manager_id
        notificationRecipientType = "manager"
      } else if (userType === "manager") {
        updateData.status = "Approved"
        updateData.manager_comments = comments || null
        updateData.approved_at = new Date().toISOString()
        notificationTitle = "Leave Request Approved"
        notificationMessage = `Your leave request for ${leaveRequest.leave_type} has been fully approved.`
      }
    } else {
      updateData.status = "Rejected"
      updateData.rejected_at = new Date().toISOString()
      notificationTitle = "Leave Request Rejected"
      notificationMessage = `Your leave request for ${leaveRequest.leave_type} has been rejected.`
      if (userType === "team-lead") {
        updateData.team_lead_comments = comments || null
        notificationMessage += ` by your Team Lead.`
      } else if (userType === "manager") {
        updateData.manager_comments = comments || null
        notificationMessage += ` by your Manager.`
      }
    }

    const { data: updatedRequest, error: updateError } = await supabase
      .from("leave_requests")
      .update(updateData)
      .eq("id", requestId)
      .select()
      .single()

    if (updateError) {
      console.error("Error updating leave request:", updateError)
      return NextResponse.json({ error: "Failed to update leave request" }, { status: 500 })
    }

    // Create notification
    if (notificationRecipientId) {
      const { error: notificationError } = await supabase.from("notifications").insert({
        recipient_type: notificationRecipientType,
        recipient_id: notificationRecipientId,
        title: notificationTitle,
        message: notificationMessage + (comments ? ` Comments: ${comments}` : ""),
        type: "leave_request_update",
        reference_id: requestId,
      })

      if (notificationError) {
        console.error("Error creating notification:", notificationError)
      }
    }

    return NextResponse.json({
      message: `Leave request ${action === "approve" ? "approved" : "rejected"} successfully`,
      data: updatedRequest,
    })
  } catch (error) {
    console.error("Error in PATCH leave request:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
