import { type NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";

// GET Leave Requests for a Manager
export async function GET(request: NextRequest) {
  const supabase = createServerSupabaseClient();

  try {
    const { searchParams } = new URL(request.url);
    const managerId = searchParams.get("managerId");
    const status = searchParams.get("status");

    if (!managerId) {
      return NextResponse.json({ error: "managerId is required" }, { status: 400 });
    }

    let query = supabase
      .from("leave_requests")
      .select(`
        *,
        employee:employees!fk_employee_id(id, name, email_address)
      `)
      .eq("manager_id", managerId)
      .order("created_at", { ascending: false });

    if (status && status !== "All") {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching leave requests:", error);
      return NextResponse.json({ error: "Failed to fetch leave requests" }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] });
  } catch (error) {
    console.error("Error in GET leave requests:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH Approve/Reject Leave Request
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

    const { data: leaveRequest, error: fetchError } = await supabase
      .from("leave_requests")
      .select("*")
      .eq("id", requestId)
      .single();

    if (fetchError || !leaveRequest) {
      return NextResponse.json({ error: "Leave request not found" }, { status: 404 });
    }

    if (leaveRequest.status !== "Pending Manager Approval") {
      return NextResponse.json({
        error: `Request is not pending manager approval (current status: ${leaveRequest.status})`
      }, { status: 400 });
    }

    // ✅ FIX: Include managerId and approved_by_manager_id in update
    const updateData: Record<string, any> = {
      manager_comments: comments || null,
      manager_id: managerId, // ✅ Store the manager ID who took action
      approved_by_manager_id: managerId, // ✅ Store who approved/rejected it
      updated_at: new Date().toISOString(), // ✅ Track when it was updated
    };

    let notificationTitle = "";
    let notificationMessage = "";
    const recipientId = leaveRequest.employee_id;

    if (action === "approve") {
      updateData.status = "Approved";
      updateData.approved_at = new Date().toISOString();
      updateData.approved_by_manager_id = managerId; // ✅ Specifically track who approved
      notificationTitle = "Leave Request Approved";
      notificationMessage = `Your leave request for ${leaveRequest.leave_type} has been fully approved by manager.`;
    } else {
      updateData.status = "Rejected";
      updateData.rejected_at = new Date().toISOString();
      updateData.rejected_by_manager_id = managerId; // ✅ Track who rejected
      notificationTitle = "Leave Request Rejected";
      notificationMessage = `Your leave request for ${leaveRequest.leave_type} has been rejected by manager.`;
    }

    console.log("Updating leave request with data:", updateData); // ✅ Debug log

    const { data: updatedRequest, error: updateError } = await supabase
      .from("leave_requests")
      .update(updateData)
      .eq("id", requestId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating leave request:", updateError);
      return NextResponse.json({ error: "Failed to update leave request" }, { status: 500 });
    }

    // ✅ Create notification with manager info
    const { error: notificationError } = await supabase.from("notifications").insert({
      recipient_type: "employee",
      recipient_id: recipientId,
      title: notificationTitle,
      message: notificationMessage + (comments ? `. Comments: ${comments}` : ""),
      type: "leave_request_update",
      reference_id: requestId,
      created_by: managerId, // ✅ Track who created the notification
    });

    if (notificationError) {
      console.error("Error creating notification:", notificationError);
    }

    console.log("Leave request updated successfully:", updatedRequest); // ✅ Success log

    return NextResponse.json({
      message: `Leave request ${action === "approve" ? "approved" : "rejected"} successfully`,
      data: updatedRequest,
    });
  } catch (error) {
    console.error("Error in PATCH leave request:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}