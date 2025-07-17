import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { employeeId, permissionType, date, startTime, endTime, reason } = body

    if (!employeeId || !permissionType || !date || !startTime || !endTime || !reason) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Get employee details
    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .select("id, name, email_address, manager_id")
      .eq("id", employeeId)
      .single()

    if (employeeError || !employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 })
    }

    // Get team lead for this employee
    const { data: teamMember, error: teamError } = await supabase
      .from("team_members")
      .select("team_lead_id")
      .eq("employee_id", employeeId)
      .eq("is_active", true)
      .single()

    if (teamError || !teamMember) {
      return NextResponse.json({ error: "Team lead not found for this employee" }, { status: 404 })
    }

    // Insert permission request
    const { data: permissionRequest, error: insertError } = await supabase
      .from("permission_requests")
      .insert({
        employee_id: employeeId,
        employee_name: employee.name,
        employee_email: employee.email_address,
        team_lead_id: teamMember.team_lead_id,
        manager_id: employee.manager_id,
        permission_type: permissionType,
        date: date,
        start_time: startTime,
        end_time: endTime,
        reason: reason,
        status: "Pending Team Lead",
      })
      .select()
      .single()

    if (insertError) {
      console.error("Error inserting permission request:", insertError)
      return NextResponse.json({ error: "Failed to submit permission request" }, { status: 500 })
    }

    // Create notification for team lead
    const { error: notificationError } = await supabase.from("notifications").insert({
      recipient_type: "team-lead",
      recipient_id: teamMember.team_lead_id,
      title: "New Permission Request",
      message: `${employee.name} has submitted a permission request for ${permissionType}`,
      type: "permission_request",
      reference_id: permissionRequest.id,
    })

    if (notificationError) {
      console.error("Error creating notification:", notificationError)
    }

    return NextResponse.json({
      message: "Permission request submitted successfully",
      data: permissionRequest,
    })
  } catch (error) {
    console.error("Error in permission request API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get("employeeId")
    const teamLeadId = searchParams.get("teamLeadId")

    let query = supabase
      .from("permission_requests")
      .select("*, employee:employees(id, name, email_address, designation, phone_number, address)")
      .order("created_at", { ascending: false })

    if (employeeId) {
      query = query.eq("employee_id", employeeId)
    }

    if (teamLeadId) {
      query = query.eq("team_lead_id", teamLeadId)
    }

    const { data, error } = await query

    if (error) {
      console.error("Error fetching permission requests:", error)
      return NextResponse.json({ error: "Failed to fetch permission requests" }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Error in GET permission requests:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { requestId, action, teamLeadId, comments } = body

    if (!requestId || !action || !teamLeadId) {
      return NextResponse.json({ error: "Missing required fields: requestId, action, teamLeadId" }, { status: 400 })
    }

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: 'Invalid action. Use "approve" or "reject"' }, { status: 400 })
    }

    // Get the permission request details
    const { data: permissionRequest, error: fetchError } = await supabase
      .from("permission_requests")
      .select("*")
      .eq("id", requestId)
      .single()

    if (fetchError || !permissionRequest) {
      return NextResponse.json({ error: "Permission request not found" }, { status: 404 })
    }

    // Verify that the team lead is authorized to approve/reject this request
    if (permissionRequest.team_lead_id !== teamLeadId) {
      return NextResponse.json(
        { error: "Unauthorized: You can only approve/reject requests assigned to you" },
        { status: 403 },
      )
    }

    // Check if request is already processed
    const currentStatus = permissionRequest.status?.trim()
    if (currentStatus !== "Pending Team Lead") {
      return NextResponse.json(
        {
          error: `Request has already been ${permissionRequest.status}`,
          currentStatus: permissionRequest.status,
        },
        { status: 400 },
      )
    }

    // Update the permission request
    const updateData: any = {
      team_lead_comments: comments || null,
    }

    let notificationTitle = ""
    let notificationMessage = ""
    let notificationRecipientId = permissionRequest.employee_id
    let notificationRecipientType = "employee"

    if (action === "approve") {
      // When team lead approves, send to manager for final approval
      updateData.status = "Pending Manager Approval"
      notificationTitle = "Permission Request Approved by Team Lead"
      notificationMessage = `${permissionRequest.employee_name}'s permission request for ${permissionRequest.permission_type} has been approved by their Team Lead and is now pending your approval.`
      notificationRecipientId = permissionRequest.manager_id // Notify manager
      notificationRecipientType = "manager"
    } else {
      // When team lead rejects, request is fully rejected
      updateData.status = "Rejected"
      updateData.rejected_at = new Date().toISOString()
      notificationTitle = "Permission Request Rejected"
      notificationMessage = `Your permission request for ${permissionRequest.permission_type} has been rejected by your Team Lead.`
    }

    const { data: updatedRequest, error: updateError } = await supabase
      .from("permission_requests")
      .update(updateData)
      .eq("id", requestId)
      .select()
      .single()

    if (updateError) {
      console.error("Error updating permission request:", updateError)
      return NextResponse.json({ error: "Failed to update permission request" }, { status: 500 })
    }

    // Create notification
    if (notificationRecipientId) {
      const { error: notificationError } = await supabase.from("notifications").insert({
        recipient_type: notificationRecipientType,
        recipient_id: notificationRecipientId,
        title: notificationTitle,
        message: notificationMessage + (comments ? `. Comment: ${comments}` : ""),
        type: "permission_request_update",
        reference_id: requestId,
      })

      if (notificationError) {
        console.error("Error creating notification:", notificationError)
      }
    }

    return NextResponse.json({
      message: `Permission request ${action === "approve" ? "approved and sent to manager" : "rejected"} successfully`,
      data: updatedRequest,
    })
  } catch (error) {
    console.error("Error in PATCH permission request:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
