import { type NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";

// ✅ Moved helper functions to top level
const getYearMonthRanges = (start: Date, end: Date) => {
  const ranges: { year: number; month: number }[] = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const last = new Date(end.getFullYear(), end.getMonth(), 1);
  while (cursor <= last) {
    ranges.push({ year: cursor.getFullYear(), month: cursor.getMonth() + 1 });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return ranges;
};

const leaveDaysInMonth = (
  year: number,
  month: number,
  start: Date,
  end: Date
) => {
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0);
  const sliceStart = start > monthStart ? start : monthStart;
  const sliceEnd = end < monthEnd ? end : monthEnd;
  const diffMs = sliceEnd.getTime() - sliceStart.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
};

// GET Leave Requests for a Manager
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const url = new URL(request.url);
    const managerId = url.searchParams.get("managerId");

    if (!managerId) {
      return NextResponse.json({ error: "Missing managerId" }, { status: 400 });
    }

    console.log("🔄 Fetching leave requests for manager:", managerId);

    // Get manager details first
    const { data: manager, error: managerError } = await supabase
      .from("employees")
      .select("*")
      .eq("employee_id", managerId) // Using employee_id instead of id
      .single();

    if (managerError) {
      console.error("Manager Fetch Error:", managerError);
      return NextResponse.json({ error: "Manager not found" }, { status: 404 });
    }

    console.log("📋 Manager found:", manager.name);

    // Get leave requests with employee and team lead information
    const { data: leaveRequests, error: leaveError } = await supabase
      .from("leave_requests")
      .select(
        `
        *,
        employee:employees!leave_requests_employee_id_fkey (
          id,
          employee_id,
          name,
          department,
          designation,
          manager_id,
          team_lead_id,
          phoneNumber,
          emailAddress,
          address
        ),
        team_lead:employees!leave_requests_team_lead_id_fkey (
          id,
          employee_id,
          name,
          department,
          designation
        )
      `
      )
      .eq("manager_id", manager.id) // Use the manager's UUID
      .order("created_at", { ascending: false });

    if (leaveError) {
      console.error("Leave Fetch Error:", leaveError);
      return NextResponse.json(
        {
          error: "Failed to fetch leave requests",
          details: leaveError.message,
        },
        { status: 500 }
      );
    }

    console.log(
      `📊 Found ${leaveRequests?.length || 0} leave requests for manager`
    );

    // Transform the data to include team lead information
    const transformedRequests =
      leaveRequests?.map((request) => ({
        ...request,
        employee_name: request.employee?.name || "Unknown Employee",
        team_lead_name: request.team_lead?.name || "No Team Lead Assigned",
        team_lead_employee_id: request.team_lead?.employee_id || null,
        employee: {
          ...request.employee,
          team_lead: request.team_lead?.name || "No Team Lead Assigned",
        },
      })) || [];

    return NextResponse.json({
      data: transformedRequests,
      manager: {
        id: manager.id,
        employee_id: manager.employee_id,
        name: manager.name,
        department: manager.department,
      },
    });
  } catch (error) {
    console.error("Unexpected Error:", error);
    return NextResponse.json(
      { error: "Unexpected server error", details: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const supabase = createServerSupabaseClient();

  try {
    const body = await request.json();
    const { requestId, action, comments, userType, managerId } = body;

    if (!requestId || !action || !userType || !managerId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Use "approve" or "reject"' },
        { status: 400 }
      );
    }

    // Get manager's UUID from employee_id
    const { data: managerData, error: managerError } = await supabase
      .from("employees")
      .select("id, name")
      .eq("employee_id", managerId)
      .single();

    if (managerError || !managerData) {
      return NextResponse.json({ error: "Manager not found" }, { status: 404 });
    }

    const managerUUID = managerData.id;

    // Get the leave request with team lead information
    const { data: leaveRequest, error: fetchError } = await supabase
      .from("leave_requests")
      .select(
        `
        *,
        employee:employees!leave_requests_employee_id_fkey (
          id,
          employee_id,
          name
        ),
        team_lead:employees!leave_requests_team_lead_id_fkey (
          id,
          employee_id,
          name
        )
      `
      )
      .eq("id", requestId)
      .single();

    if (fetchError || !leaveRequest) {
      return NextResponse.json(
        { error: "Leave request not found" },
        { status: 404 }
      );
    }

    // Check if request is in correct status for manager approval
    if (
      !["Pending", "Pending Manager Approval", "Team Lead Approved"].includes(
        leaveRequest.status
      )
    ) {
      return NextResponse.json(
        {
          error: `Request is not pending manager approval (current status: ${leaveRequest.status})`,
        },
        { status: 400 }
      );
    }

    const updateData: Record<string, any> = {
      manager_comments: comments || null,
      manager_id: managerUUID,
      updated_at: new Date().toISOString(),
    };

    let notificationTitle = "";
    let notificationMessage = "";
    let statusHistory = leaveRequest.status_history || [];
    const recipientId = leaveRequest.employee_id;

    if (action === "approve") {
      updateData.status = "Approved";
      updateData.manager_approved_at = new Date().toISOString();
      notificationTitle = "Leave Request Approved";
      notificationMessage = `Your leave request for ${leaveRequest.leave_type} has been approved by manager ${managerData.name}.`;

      // Add to status history
      statusHistory.push({
        status: "Approved",
        updated_by: managerUUID,
        updated_by_name: managerData.name,
        updated_by_role: "Manager",
        updated_at: new Date().toISOString(),
        comments: comments || null,
      });
    } else {
      updateData.status = "Rejected";
      updateData.manager_rejected_at = new Date().toISOString();
      notificationTitle = "Leave Request Rejected";
      notificationMessage = `Your leave request for ${leaveRequest.leave_type} has been rejected by manager ${managerData.name}.`;

      // Add to status history
      statusHistory.push({
        status: "Rejected",
        updated_by: managerUUID,
        updated_by_name: managerData.name,
        updated_by_role: "Manager",
        updated_at: new Date().toISOString(),
        comments: comments || null,
      });
    }

    updateData.status_history = statusHistory;

    const { data: updatedRequest, error: updateError } = await supabase
      .from("leave_requests")
      .update(updateData)
      .eq("id", requestId)
      .select(
        `
        *,
        employee:employees!leave_requests_employee_id_fkey (
          id,
          employee_id,
          name
        ),
        team_lead:employees!leave_requests_team_lead_id_fkey (
          id,
          employee_id,
          name
        )
      `
      )
      .single();

    if (updateError) {
      console.error("Update Error:", updateError);
      return NextResponse.json(
        {
          error: "Failed to update leave request",
          details: updateError.message,
        },
        { status: 500 }
      );
    }

    // Send notification to employee
    const { error: notificationError } = await supabase
      .from("notifications")
      .insert({
        recipient_type: "employee",
        recipient_id: recipientId,
        title: notificationTitle,
        message:
          notificationMessage + (comments ? `. Comments: ${comments}` : ""),
        type: "leave_request_update",
        reference_id: requestId,
        created_by: managerUUID,
      });

    if (notificationError) {
      console.error("Notification creation failed:", notificationError.message);
    }

    console.log(`✅ Leave request ${action}ed by manager: ${managerData.name}`);

    return NextResponse.json({
      message: `Leave request ${action}ed successfully`,
      data: updatedRequest,
      team_lead_info: {
        name: leaveRequest.team_lead?.name || "No Team Lead",
        employee_id: leaveRequest.team_lead?.employee_id || null,
      },
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
