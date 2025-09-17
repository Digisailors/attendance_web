import { type NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { employeeId, leaveType, startDate, endDate, reason } = body;

    if (!employeeId || !leaveType || !startDate || !endDate || !reason) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get employee details
    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .select("id, name, email_address, manager_id")
      .eq("id", employeeId)
      .single();

    if (employeeError || !employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    // Get team lead for this employee
    const { data: teamMember, error: teamError } = await supabase
      .from("team_members")
      .select("team_lead_id")
      .eq("employee_id", employeeId)
      .eq("is_active", true)
      .single();

    if (teamError || !teamMember) {
      return NextResponse.json(
        { error: "Team lead not found for this employee" },
        { status: 404 }
      );
    }

    // Insert leave request
    const { data: leaveRequest, error: insertError } = await supabase
      .from("leave_requests")
      .insert({
        employee_id: employeeId,
        employee_name: employee.name,
        employee_email: employee.email_address,
        team_lead_id: teamMember.team_lead_id,
        manager_id: employee?.manager_id,
        leave_type: leaveType,
        start_date: startDate,
        end_date: endDate,
        reason: reason,
        status: "Pending Team Lead",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting leave request:", insertError);
      return NextResponse.json(
        { error: "Failed to submit leave request" },
        { status: 500 }
      );
    }

    // Create notification for team lead
    const { error: notificationError } = await supabase
      .from("notifications")
      .insert({
        recipient_type: "team-lead",
        recipient_id: teamMember.team_lead_id,
        title: "New Leave Request",
        message: `${employee.name} has submitted a leave request for ${leaveType}`,
        type: "leave_request",
        reference_id: leaveRequest.id,
      });

    if (notificationError) {
      console.error("Error creating notification:", notificationError);
    }

    return NextResponse.json({
      message: "Leave request submitted successfully",
      data: leaveRequest,
    });
  } catch (error) {
    console.error("Error in leave request API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // 🔁 Ignore query params like managerId

    const { data: leaveRequests, error: leaveError } = await supabase
      .from("leave_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (leaveError) {
      console.error("🟥 Supabase leave_requests fetch error:", leaveError);
      return NextResponse.json({ error: leaveError.message }, { status: 500 });
    }

    console.log("✅ All leave requests fetched:", leaveRequests);

    return NextResponse.json({ data: leaveRequests }, { status: 200 });
  } catch (err: any) {
    console.error("🟥 Caught unexpected server error:", err);
    return NextResponse.json(
      { error: "Server error", details: err.message },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { requestId, action, teamLeadId, comments, userType } = body;

    if (!requestId || !action || !teamLeadId || !userType) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: requestId, action, teamLeadId, userType",
        },
        { status: 400 }
      );
    }

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Use "approve" or "reject"' },
        { status: 400 }
      );
    }

    // Get the leave request details
    const { data: leaveRequest, error: fetchError } = await supabase
      .from("leave_requests")
      .select("*")
      .eq("id", requestId)
      .single();

    if (fetchError || !leaveRequest) {
      return NextResponse.json(
        { error: "Leave request not found" },
        { status: 404 }
      );
    }

    if (!["Pending", "Pending Team Lead"].includes(leaveRequest.status)) {
      return NextResponse.json(
        {
          error: `Request is not pending team lead approval (current status: ${leaveRequest.status})`,
        },
        { status: 400 }
      );
    }

    // Additional check: Verify the request is actually assigned to this team lead
    if (leaveRequest.team_lead_id !== teamLeadId) {
      return NextResponse.json(
        {
          error:
            "Unauthorized: You can only approve/reject requests assigned to you",
        },
        { status: 403 }
      );
    }

    // Update the leave request
    const updateData: any = {
      team_lead_comments: comments || null,
    };

    let notificationTitle = "";
    let notificationMessage = "";
    let notificationRecipientId = leaveRequest.employee_id;
    let notificationRecipientType = "employee";

    if (action === "approve") {
      // When team lead approves, send to manager for final approval
      updateData.status = "Pending Manager Approval";
      notificationTitle = "Leave Request Approved by Team Lead";
      notificationMessage = `${leaveRequest.employee_name}'s leave request for ${leaveRequest.leave_type} has been approved by their Team Lead and is now pending your approval.`;
      notificationRecipientId = leaveRequest.manager_id; // Notify manager
      notificationRecipientType = "manager";
    } else {
      // When team lead rejects, request is fully rejected
      updateData.status = "Rejected";
      updateData.rejected_at = new Date().toISOString();
      notificationTitle = "Leave Request Rejected";
      notificationMessage = `Your leave request for ${leaveRequest.leave_type} has been rejected by your Team Lead.`;
    }

    const { data: updatedRequest, error: updateError } = await supabase
      .from("leave_requests")
      .update(updateData)
      .eq("id", requestId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating leave request:", updateError);
      return NextResponse.json(
        { error: "Failed to update leave request" },
        { status: 500 }
      );
    }

    // Create notification
    if (notificationRecipientId) {
      const { error: notificationError } = await supabase
        .from("notifications")
        .insert({
          recipient_type: notificationRecipientType,
          recipient_id: notificationRecipientId,
          title: notificationTitle,
          message:
            notificationMessage + (comments ? `. Comment: ${comments}` : ""),
          type: "leave_request_update",
          reference_id: requestId,
        });

      if (notificationError) {
        console.error("Error creating notification:", notificationError);
      }
    }

    return NextResponse.json({
      message: `Leave request ${
        action === "approve" ? "approved and sent to manager" : "rejected"
      } successfully`,
      data: updatedRequest,
    });
  } catch (error) {
    console.error("Error in PATCH leave request:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
