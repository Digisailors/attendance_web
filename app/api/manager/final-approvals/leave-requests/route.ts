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

const leaveDaysInMonth = (year: number, month: number, start: Date, end: Date) => {
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
    const supabase = createServerSupabaseClient()
    const url = new URL(request.url)
    const managerId = url.searchParams.get("managerId")

    if (!managerId) {
      return NextResponse.json({ error: "Missing managerId" }, { status: 400 })
    }

    // 🔍 Update this column name based on your DB schema
    const { data: manager, error: managerError } = await supabase
      .from('employees')
      .select('*')
      .eq('id', managerId) // <-- Change 'id' if your actual column is 'emp_code' or similar
      .single()

    if (managerError) {
      console.error("Manager Fetch Error:", managerError)
    }

    if (!manager) {
      return NextResponse.json({ error: 'Manager not found' }, { status: 404 })
    }

    // Get leave requests for this manager's team
    const { data: leaveRequests, error: leaveError } = await supabase
      .from('leave_requests')
      .select(`
        *,
        employee:employees (
          id,
          name,
          department,
          designation,
          manager_id
        )
      `)
      .eq('employees.manager_id', managerId)

    if (leaveError) {
      console.error("Leave Fetch Error:", leaveError)
      return NextResponse.json({ error: 'Failed to fetch leave requests' }, { status: 500 })
    }

    return NextResponse.json({ leaveRequests })

  } catch (error) {
    console.error("Unexpected Error:", error)
    return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 })
  }
}






export async function PATCH(request: NextRequest) {
  const supabase = createServerSupabaseClient();

  try {
    const body = await request.json();
    const { requestId, action, comments, userType, managerId } = body;

    if (!requestId || !action || !userType || !managerId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: 'Invalid action. Use "approve" or "reject"' }, { status: 400 });
    }

    // Get manager's UUID from employee_id
    const { data: managerData, error: managerError } = await supabase
      .from("employees")
      .select("id")
      .eq("employee_id", managerId)
      .single();

    if (managerError || !managerData) {
      return NextResponse.json({ error: "Manager not found" }, { status: 404 });
    }

    const managerUUID = managerData.id;

    const { data: leaveRequest, error: fetchError } = await supabase
      .from("leave_requests")
      .select("*")
      .eq("id", requestId)
      .single();

    if (fetchError || !leaveRequest) {
      return NextResponse.json({ error: "Leave request not found" }, { status: 404 });
    }
if (!["Pending", "Pending Manager Approval"].includes(leaveRequest.status)) {
  return NextResponse.json({
    error: `Request is not pending manager approval (current status: ${leaveRequest.status})`
  }, { status: 400 });
}


    const updateData: Record<string, any> = {
      manager_comments: comments || null,
      manager_id: managerUUID,
      updated_at: new Date().toISOString(),
    };

    let notificationTitle = "";
    let notificationMessage = "";
    const recipientId = leaveRequest.employee_id;

    if (action === "approve") {
      updateData.status = "Approved";
      updateData.approved_at = new Date().toISOString();
      notificationTitle = "Leave Request Approved";
      notificationMessage = `Your leave request for ${leaveRequest.leave_type} has been approved by manager.`;
    } else {
      updateData.status = "Rejected";
      updateData.rejected_at = new Date().toISOString();
      notificationTitle = "Leave Request Rejected";
      notificationMessage = `Your leave request for ${leaveRequest.leave_type} has been rejected by manager.`;
    }

    const { data: updatedRequest, error: updateError } = await supabase
      .from("leave_requests")
      .update(updateData)
      .eq("id", requestId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: "Failed to update leave request", details: updateError.message }, { status: 500 });
    }

    // Send notification
    const { error: notificationError } = await supabase.from("notifications").insert({
      recipient_type: "employee",
      recipient_id: recipientId,
      title: notificationTitle,
      message: notificationMessage + (comments ? `. Comments: ${comments}` : ""),
      type: "leave_request_update",
      reference_id: requestId,
      created_by: managerUUID,
    });

    if (notificationError) {
      console.error("Notification creation failed:", notificationError.message);
    }

    return NextResponse.json({
      message: `Leave request ${action}ed successfully`,
      data: updatedRequest,
    });

  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}