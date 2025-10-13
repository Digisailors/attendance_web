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

    // Get all active team leads for this employee
    const { data: teamMembers, error: teamError } = await supabase
      .from("team_members")
      .select("team_lead_id")
      .eq("employee_id", employeeId)
      .eq("is_active", true);

    if (teamError || !teamMembers || teamMembers.length === 0) {
      return NextResponse.json(
        { error: "No team leads found for this employee" },
        { status: 404 }
      );
    }

    // Extract team lead IDs
    const teamLeadIds = teamMembers.map((tm) => tm.team_lead_id);

    // Generate unique leave group ID
    const leaveGroupId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).substring(2);

    // Insert SINGLE leave request with team_lead_ids array
    const { data: leaveRequest, error: insertError } = await supabase
      .from("leave_requests")
      .insert({
        employee_id: employeeId,
        employee_name: employee.name,
        employee_email: employee.email_address,
        team_lead_id: null, // Will be set when approved
        team_lead_ids: teamLeadIds, // Array of eligible team leads
        manager_id: employee?.manager_id,
        leave_type: leaveType,
        start_date: startDate,
        end_date: endDate,
        reason: reason,
        status: "Pending Team Lead",
        leave_group_id: leaveGroupId,
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

    // Create notifications for all eligible team leads
    const notifications = teamLeadIds.map((teamLeadId) => ({
      recipient_type: "team-lead",
      recipient_id: teamLeadId,
      title: "New Leave Request",
      message: `${employee.name} has submitted a leave request for ${leaveType}`,
      type: "leave_request",
      reference_id: leaveGroupId,
    }));

    const { error: notificationError } = await supabase
      .from("notifications")
      .insert(notifications);

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
    const url = new URL(request.url);
    const teamLeadId = url.searchParams.get("teamLeadId");
    const month = url.searchParams.get("month");
    const year = url.searchParams.get("year");

    let query = supabase
      .from("leave_requests")
      .select("*")
      .order("created_at", { ascending: false });

    // Filter by teamLeadId if provided
    if (teamLeadId) {
      query = query.contains("team_lead_ids", [teamLeadId]);
    }

    // Filter by date if provided
    if (month && year) {
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0);
      query = query
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());
    }

    const { data: leaveRequests, error: leaveError } = await query;

    if (leaveError) {
      console.error("Supabase leave_requests fetch error:", leaveError);
      return NextResponse.json({ error: leaveError.message }, { status: 500 });
    }

    // Manually fetch employee details for each leave request
    const results = [];
    for (const req of leaveRequests || []) {
      const { data: employee, error: empError } = await supabase
        .from("employees")
        .select(
          "name, id as employee_id, designation, phoneNumber, emailAddress, address"
        )
        .eq("id", req.employee_id)
        .single();
      results.push({
        ...req,
        employee: employee || null,
      });
    }

    console.log(`Fetched ${results.length} leave requests`);
    return NextResponse.json({ data: results }, { status: 200 });
  } catch (err: any) {
    console.error("Unexpected server error:", err);
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

    // Find the leave request
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

    // Check if this team lead is eligible to process this request
    if (
      !leaveRequest.team_lead_ids ||
      !leaveRequest.team_lead_ids.includes(teamLeadId)
    ) {
      return NextResponse.json(
        { error: "You are not authorized to process this leave request" },
        { status: 403 }
      );
    }

    // Check if the request is still pending
    if (!["Pending Team Lead", "Pending"].includes(leaveRequest.status)) {
      return NextResponse.json(
        { error: "This leave request has already been processed" },
        { status: 400 }
      );
    }

    // Prepare update data
    const updateData: any = {
      team_lead_comments: comments || null,
      team_lead_id: teamLeadId, // Set the acting team lead
    };

    let notificationTitle = "";
    let notificationMessage = "";
    let notificationRecipientId = leaveRequest.employee_id;
    let notificationRecipientType = "employee";

    if (action === "approve") {
      updateData.status = "Pending Manager Approval";
      updateData.approved_at = new Date().toISOString();

      notificationTitle = "Leave Request Approved by Team Lead";
      notificationMessage = `Your leave request for ${leaveRequest.leave_type} has been approved by your Team Lead and is now pending Manager approval.`;

      // Also notify manager if exists
      if (leaveRequest.manager_id) {
        setTimeout(async () => {
          await supabase.from("notifications").insert({
            recipient_type: "manager",
            recipient_id: leaveRequest.manager_id,
            title: "Leave Request Pending Approval",
            message: `${leaveRequest.employee_name}'s leave request for ${leaveRequest.leave_type} has been approved by Team Lead and requires your approval.`,
            type: "leave_request_pending",
            reference_id: leaveRequest.id,
          });
        }, 100);
      }
    } else {
      updateData.status = "Rejected";
      updateData.rejected_at = new Date().toISOString();

      notificationTitle = "Leave Request Rejected";
      notificationMessage = `Your leave request for ${leaveRequest.leave_type} has been rejected by your Team Lead.`;
    }

    // Update the leave request
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

    // Create notification for employee
    const { error: notificationError } = await supabase
      .from("notifications")
      .insert({
        recipient_type: notificationRecipientType,
        recipient_id: notificationRecipientId,
        title: notificationTitle,
        message:
          notificationMessage + (comments ? ` Comment: ${comments}` : ""),
        type: "leave_request_update",
        reference_id: leaveRequest.id,
      });

    if (notificationError) {
      console.error("Error creating notification:", notificationError);
    }

    return NextResponse.json({
      message: `Leave request ${action}d successfully`,
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
